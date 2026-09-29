import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";
import type { ITaskWriter } from "../../modules/status/ports/task-writer.port.js";
import { USER_TYPE } from "../../common/constants/constants.js";

/**
 * Shared "completed" condition, previously copy-pasted in 4 places
 * (countCompleted, countOverdue, findAvgDurationCompleted, findStatusTrends).
 * Kept in one spot so a future change to what "completed" means
 * (e.g. adding a new terminal status name) can't drift out of sync.
 */
const COMPLETED_STATUS_WHERE = {
  [Op.or]: [{ name: { [Op.in]: ["Done", "Completed"] } }, { is_final: true }],
};

const NOT_COMPLETED_STATUS_WHERE = {
  [Op.not]: COMPLETED_STATUS_WHERE,
};

// Hard ceiling on page size so a caller (or a malicious client) can't request
// limit=999999 and force the DB to materialize the entire table.
const MAX_PAGE_LIMIT = 100;

/**
 * The only User columns a task response is allowed to embed for its assignees.
 *
 * Shared by the board query and the by-id lookups so the two cannot drift --
 * they previously carried separate literal lists, which is how the board and
 * `/task/single` ended up disagreeing about what a task discloses.
 *
 * Identity only. `email`, `user_type` and `workspace_id` are user details that a
 * `task.view` holder has no permission to read; they belong to `GET /user/all`,
 * which is gated on `user.view`. See the include sites for the full reasoning.
 */
const ASSIGNEE_IDENTITY_ATTRIBUTES = ["id", "name"];

export class TaskRepositoryV2 implements ITaskWriter {
  constructor(private readonly db: DbRegistry) {}

  async deleteTasksByStatusId(
    statusId: number,
    transaction: Transaction,
  ): Promise<void> {
    await this.db.Task.destroy({
      where: { status_id: statusId },
      transaction,
    });
  }

  /**
   * Duplicate check for task creation.
   *
   * Scoped to the WORKSPACE, not the creator. On a workspace-wide board two
   * people creating a same-named task in the same status is a genuine collision
   * the user would see as a duplicate, so keying this on `user_id` let the same
   * name/status pair exist repeatedly depending on who created it.
   */
  async findDuplicate(
    params: {
      task_name: string;
      status_id: unknown;
      workspace_id: number;
    },
    transaction?: Transaction,
  ) {
    return this.db.Task.findOne({
      where: params,
      transaction,
    });
  }

  async create(data: Record<string, unknown>, transaction?: Transaction) {
    return this.db.Task.create(data, { transaction });
  }

  async replaceAssignees(taskId: number, userIds: number[], transaction?: Transaction) {
    await this.db.TaskAssignee.destroy({ where: { task_id: taskId }, transaction });
    if (userIds.length > 0) {
      await this.db.TaskAssignee.bulkCreate(
        userIds.map((userId) => ({ task_id: taskId, user_id: userId })),
        { transaction },
      );
    }
  }

  /**
   * Escapes SQL LIKE wildcards (%, _, \) in user-supplied search text so a
   * search for e.g. "50%_off" is treated literally instead of as a wildcard
   * pattern. Without this, searches silently return wrong/broader results.
   */
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  /**
   * Every task in a workspace, optionally filtered.
   *
   * Visibility is workspace-scoped by design: a task belongs to a workspace, so
   * any member of that workspace may read it regardless of who created it or
   * who it is assigned to. Authorization (`task.view`) is enforced one layer up
   * by `PermissionGuard`; this method is responsible only for tenancy.
   *
   * The previous signature took a user id and filtered `WHERE user_id = <caller>`,
   * which meant a board showed only tasks the caller had created. Assignment was
   * written to `TaskAssignee` but no filter ever read it, so a task created by
   * one user and assigned to another was invisible to the assignee -- the
   * reported bug. `workspaceId` is always resolved server-side from the
   * authenticated user, never from a client-supplied value.
   */
  async findAllInWorkspace(
    workspaceId: number,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      priority?: string;
      start_date?: Date;
      end_date?: Date;
      sortBy?: string;
      sortOrder?: string;
    },
    transaction?: Transaction,
  ) {
    // The tenant predicate is mandatory, not optional. There is deliberately no
    // branch that omits it: a workspace-wide read with no tenant filter would
    // return every tenant's tasks.
    const where: any = { workspace_id: workspaceId };

    if (options?.search) {
      const escaped = this.escapeLikePattern(options.search);
      where.task_name = { [Op.like]: `%${escaped}%` };
    }
    if (options?.priority) {
      where.priority = options.priority;
    }
    if (options?.start_date) {
      where.start_date = { [Op.eq]: options.start_date };
    }
    if (options?.end_date) {
      where.end_date = { [Op.eq]: options.end_date };
    }

    let statusInclude: any = {
      model: this.db.Status,
      as: "status",
      attributes: ["id", "name", "is_final", "is_system"],
    };

    /**
     * Assignee identity, and NOTHING else.
     *
     * A task must say *who* it is assigned to, because a board with no visible
     * assignees is not usable. But the task payload is readable by anyone holding
     * `task.view`, which is a much weaker permission than `user.view` -- and
     * until this was narrowed, a `task.view`-only user who was correctly denied
     * `GET /user/all` could still read every assignee's `email`, `user_type` and
     * `workspace_id` straight out of a task, which is exactly the "learn user
     * details without the permission" path this projection used to be.
     *
     * So: `id` + `name` only. The assignee *picker* is unaffected -- it is
     * populated from `GET /user/all`, which is still gated on `user.view`, so
     * full user records remain available to callers who are allowed to have
     * them. Do not widen this list without checking that the field is genuinely
     * needed to render a task, not just convenient.
     */
    const assigneeInclude: any = {
      model: this.db.User,
      as: "assignee",
      attributes: ASSIGNEE_IDENTITY_ATTRIBUTES,
      required: false,
    };
    const assigneesInclude: any = {
      model: this.db.User,
      as: "assignees",
      attributes: ASSIGNEE_IDENTITY_ATTRIBUTES,
      through: { attributes: [] },
      required: false,
    };

    if (options?.status) {
      statusInclude.where = { name: options.status };
    }

    // Secondary sort key ("id") is important: createdAt alone can have ties
    // (bulk inserts, same-millisecond writes), which causes rows to
    // shift between pages / show up twice or not at all as data changes.
    let order: any = [
      ["createdAt", "DESC"],
      ["id", "DESC"],
    ];
    if (options?.sortBy && options?.sortOrder) {
      const validSortFields = ["task_name", "end_date"];
      if (validSortFields.includes(options.sortBy)) {
        order = [
          [options.sortBy, options.sortOrder],
          ["id", "DESC"],
        ];
      }
    }

    const queryOptions: any = {
      where,
      // `createdAt` and `updatedAt` must stay in this list even though no caller
      // selects them. `viewType=table` is the only view that paginates, and with
      // a `limit` plus an `include` Sequelize rewrites the query to select FROM
      // a derived table that projects only these attributes. The default `order`
      // below still references `createdAt`, so omitting it from this list made
      // MySQL fail with "Unknown column 'Task.createdAt' in 'order clause'"
      // (ER_BAD_FIELD_ERROR), which the service surfaced as a 500 "Internal
      // server error" on the task table view. Do not trim these.
      attributes: [
        "id",
        "task_name",
        "task_description",
        "status_id",
        "priority",
        "start_date",
        "end_date",
        "completed_date",
        "user_id",
        "assignee_id",
        "workspace_id",
        "createdAt",
        "updatedAt",
      ],
      include: [statusInclude, assigneeInclude, assigneesInclude],
      transaction,
      order,
    };

    if (options && options?.limit && options?.page) {
      // Cap limit defensively; behavior when limit/page are both provided
      // is otherwise unchanged.
      queryOptions.limit = Math.min(options.limit, MAX_PAGE_LIMIT);
      queryOptions.offset = (options.page - 1) * queryOptions.limit;
    }

    return this.db.Task.findAndCountAll(queryOptions);
  }

  /**
   * Shared implementation for the three previously-duplicated
   * find-by-id-with-status lookups. Behavior is identical to the original
   * findOneWithStatus / findByIdWithStatusJoin / findOneWithStatusAlias.
   *
   * `workspaceId` is REQUIRED and always applied. The original looked up by
   * bare `id`, which meant any authenticated user could read, update or delete a
   * task in any other workspace by guessing an id -- verified live, including
   * deleting another tenant's task. Tenancy belongs in the query, not in a
   * caller-side check that is easy to forget.
   */
  private async findTaskWithStatusById(
    id: number,
    workspaceId: number,
    transaction?: Transaction,
  ) {
    return this.db.Task.findOne({
      where: { id, workspace_id: workspaceId },
      include: [
        {
          model: this.db.Status,
          as: "status",
          attributes: ["id", "name", "is_final", "is_system", "workspace_id"],
        },
        {
          model: this.db.User,
          as: "assignee",
          // Same identity-only projection as the board query -- see
          // ASSIGNEE_IDENTITY_ATTRIBUTES.
          attributes: ASSIGNEE_IDENTITY_ATTRIBUTES,
          required: false,
        },
        {
          model: this.db.User,
          as: "assignees",
          attributes: ASSIGNEE_IDENTITY_ATTRIBUTES,
          through: { attributes: [] },
          required: false,
        },
      ],
      transaction,
    });
  }

  // All three kept as public methods (same names) so nothing calling this
  // repository needs to change. Each now takes the caller's workspace and
  // scopes the lookup to it.
  async findOneWithStatus(id: number, workspaceId: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, workspaceId, transaction);
  }

  async findByIdWithStatusJoin(id: number, workspaceId: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, workspaceId, transaction);
  }

  async findOneWithStatusAlias(id: number, workspaceId: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, workspaceId, transaction);
  }

  async findById(id: number, workspaceId: number, transaction?: Transaction) {
    return this.db.Task.findOne({ where: { id, workspace_id: workspaceId }, transaction });
  }

  /**
   * `workspace_id` is part of the WHERE clause, not just the SET, so a caller
   * can never repoint a task at another workspace (or edit one it does not own)
   * by passing a crafted payload.
   */
  async updateById(
    id: number,
    workspaceId: number,
    data: Record<string, unknown>,
    transaction?: Transaction,
  ) {
    return this.db.Task.update(data, { where: { id, workspace_id: workspaceId }, transaction });
  }

  async destroyById(id: number, workspaceId: number, transaction?: Transaction) {
    return this.db.Task.destroy({ where: { id, workspace_id: workspaceId }, transaction });
  }

  async nullCompletedDateForTasksInStatus(
    statusId: number,
    transaction?: Transaction,
  ): Promise<void> {
    await this.db.Task.update(
      { completed_date: null },
      { where: { status_id: statusId }, transaction },
    );
  }

  /** Dashboard aggregate helpers (kept for backward compatibility) */
  async countAll(workspaceId: number | null, transaction?: Transaction) {
    return this.db.Task.count({
      include: [
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      transaction,
    });
  }

  async countCompleted(workspaceId: number | null, transaction?: Transaction) {
    return this.db.Task.count({
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: COMPLETED_STATUS_WHERE,
        },
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      transaction,
    });
  }

  async countOverdue(
    currentDate: Date,
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    return this.db.Task.count({
      where: { end_date: { [Op.lt]: currentDate } },
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: NOT_COMPLETED_STATUS_WHERE,
        },
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      transaction,
    });
  }

  /**
   * OPTIMIZATION: combines countAll + countCompleted + countOverdue into a
   * single query using conditional aggregation instead of 3 separate
   * round-trips (each with its own JOIN). This is the same data the three
   * methods above return — prefer calling this one from the dashboard
   * service and dropping the three individual calls there once you've
   * verified the numbers match. The old methods are left untouched above
   * in case anything else still depends on them individually.
   */
  async getDashboardCounts(
    currentDate: Date,
    workspaceId: number | null,
    transaction?: Transaction,
  ): Promise<{ total: number; completed: number; overdue: number }> {
    const { sequelize } = this.db;

    const completedCase = `CASE WHEN (\`status\`.\`is_final\` = 1 OR \`status\`.\`name\` IN ('Done','Completed')) THEN 1 ELSE 0 END`;
    const overdueCase = `CASE WHEN (\`status\`.\`is_final\` != 1 AND \`status\`.\`name\` NOT IN ('Done','Completed')) AND \`Task\`.\`end_date\` < :currentDate THEN 1 ELSE 0 END`;

    const result: any = await this.db.Task.findOne({
      attributes: [
        [sequelize.fn("COUNT", sequelize.col("Task.id")), "total"],
        [sequelize.fn("SUM", sequelize.literal(completedCase)), "completed"],
        [sequelize.fn("SUM", sequelize.literal(overdueCase)), "overdue"],
      ],
      include: [
        {
          model: this.db.Status,
          as: "status",
          attributes: [],
        },
        {
          model: this.db.User,
          as: "user",
          attributes: [],
          where: {
            workspace_id: workspaceId,
          },
        },
      ],
      replacements: { currentDate },
      raw: true,
      transaction,
    });

    return {
      total: Number(result?.total ?? 0),
      completed: Number(result?.completed ?? 0),
      overdue: Number(result?.overdue ?? 0),
    };
  }

  async findRecentWithUserAndStatus(
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    return this.db.Task.findAll({
      attributes: [
        "id",
        "task_name",
        "task_description",
        "priority",
        "start_date",
        "end_date",
        "createdAt",
        "updatedAt",
      ],
      include: [
        {
          model: this.db.User,
          as: "user",
          attributes: ["id", "name", "email", "username"],
          where: {
            workspace_id: workspaceId,
          },
        },
        {
          model: this.db.Status,
          as: "status",
          attributes: ["id", "name"],
        },
      ],
      order: [[this.db.sequelize.literal("`Task`.`createdAt`"), "DESC"]],
      limit: 5,
      raw: true,
      nest: true,
      transaction,
    });
  }

  async findGroupedByPriority(
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: ["priority", [sequelize.literal("COUNT(*)"), "count"]],
      include: [
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      group: "priority",
      raw: true,
      transaction,
    });
  }

  async findMonthlyTasks(
    currentYear: number,
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("Task.createdAt"), "%Y-%m"),
          "month",
        ],
        [sequelize.literal("COUNT(*)"), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lte]: new Date(currentYear, 11, 31, 23, 59, 59, 999),
        },
      },
      include: [
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      group: [
        sequelize.fn("DATE_FORMAT", sequelize.col("Task.createdAt"), "%Y-%m"),
      ],
      raw: true,
      transaction,
    });
  }

  async findWeeklyTasks(
    currentYear: number,
    currentMonth: number,
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.fn("YEAR", sequelize.col("Task.createdAt")), "year"],
        [sequelize.fn("WEEK", sequelize.col("Task.createdAt"), 1), "week"],
        [sequelize.fn("COUNT", sequelize.col("Task.id")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(currentYear, currentMonth, 1),
          [Op.lte]: new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999),
        },
      },
      include: [
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      group: [
        sequelize.fn("YEAR", sequelize.col("Task.createdAt")),
        sequelize.fn("WEEK", sequelize.col("Task.createdAt"), 1),
      ],
      order: [
        [sequelize.fn("YEAR", sequelize.col("Task.createdAt")), "ASC"],
        [sequelize.fn("WEEK", sequelize.col("Task.createdAt"), 1), "ASC"],
      ],
      raw: true,
      transaction,
    });
  }

  async findYearlyByStartDate(
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.fn("YEAR", sequelize.col("Task.start_date")), "year"],
        [sequelize.fn("COUNT", sequelize.col("Task.id")), "count"],
      ],
      where: {
        start_date: { [Op.ne]: null },
      },
      include: [
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      group: [sequelize.fn("YEAR", sequelize.col("Task.start_date"))],
      raw: true,
      transaction,
    });
  }

  async findTasksPerUser(
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.col("user.id"), "userId"],
        [sequelize.col("user.name"), "userName"],
        [sequelize.literal("COUNT(*)"), "taskCount"],
      ],
      include: [
        {
          model: this.db.User,
          as: "user",
          attributes: [],
          where: {
            user_type: USER_TYPE.USER,
            workspace_id: workspaceId,
          },
        },
      ],
      group: ["user.id", "user.name"],
      raw: true,
      transaction,
    });
  }

  async findAvgDurationCompleted(
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findOne({
      attributes: [
        [
          sequelize.fn(
            "AVG",
            sequelize.fn(
              "TIMESTAMPDIFF",
              sequelize.literal("DAY"),
              sequelize.col("start_date"),
              sequelize.col("end_date"),
            ),
          ),
          "avgDurationDays",
        ],
      ],
      where: {
        start_date: { [Op.ne]: null },
        end_date: { [Op.ne]: null },
      },
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: COMPLETED_STATUS_WHERE,
          attributes: [],
        },
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      raw: true,
      transaction,
    });
  }

  async findStatusTrends(
    thirtyDaysAgo: Date,
    workspaceId: number | null,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.fn("DATE", sequelize.col("Task.updatedAt")), "date"],
        [sequelize.fn("COUNT", sequelize.col("Task.id")), "count"],
      ],
      where: {
        updatedAt: {
          [Op.gte]: thirtyDaysAgo,
        },
      },
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: COMPLETED_STATUS_WHERE,
          attributes: [],
        },
        {
          model: this.db.User,
          as: "user",
          where: {
            workspace_id: workspaceId,
          },
          attributes: [],
        },
      ],
      group: [sequelize.fn("DATE", sequelize.col("Task.updatedAt"))],
      order: [[sequelize.fn("DATE", sequelize.col("Task.updatedAt")), "ASC"]],
      raw: true,
      transaction,
    });
  }

  /**
   * Task rows for the personal dashboard, with their status attached.
   *
   * WORKSPACE-scoped, matching `findAllInWorkspace` and therefore the board
   * itself. This was `WHERE user_id = <caller>` ("tasks I created"), which after
   * the board became workspace-wide made the two disagree: a member whose board
   * showed 12 tasks had a dashboard reporting 0. A dashboard that contradicts
   * the page it summarises is worse than no dashboard, so both now read the same
   * set.
   *
   * Status is joined but only for its `is_final` / `name` flags, which the
   * service uses to decide what counts as completed. No User columns are
   * selected at all here, so this cannot leak assignee details.
   */
  async findAllInWorkspaceWithStatus(
    workspaceId: number,
    transaction?: Transaction,
  ) {
    return this.db.Task.findAll({
      where: { workspace_id: workspaceId },
      include: [
        {
          model: this.db.Status,
          as: "status",
          attributes: ["id", "name", "is_final", "is_system"],
        },
      ],
      transaction,
    });
  }

  async findGroupedByStatusInWorkspace(
    workspaceId: number,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      where: { workspace_id: workspaceId },
      include: [{ model: this.db.Status, as: "status", attributes: [] }],
      attributes: ["status_id", [sequelize.literal("COUNT(*)"), "count"]],
      group: "status_id",
      raw: true,
      transaction,
    });
  }

  async findGroupedByPriorityInWorkspace(
    workspaceId: number,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      where: { workspace_id: workspaceId },
      attributes: ["priority", [sequelize.literal("COUNT(*)"), "count"]],
      group: "priority",
      raw: true,
      transaction,
    });
  }
}