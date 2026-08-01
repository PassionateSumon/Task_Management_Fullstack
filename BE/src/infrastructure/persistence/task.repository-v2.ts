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

  async findDuplicate(
    params: {
      task_name: string;
      status_id: unknown;
      user_id: number;
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

  /**
   * Escapes SQL LIKE wildcards (%, _, \) in user-supplied search text so a
   * search for e.g. "50%_off" is treated literally instead of as a wildcard
   * pattern. Without this, searches silently return wrong/broader results.
   */
  private escapeLikePattern(value: string): string {
    return value.replace(/[\\%_]/g, (char) => `\\${char}`);
  }

  async findAllForUser(
    userKey: number | string | null | undefined,
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
    const where: any = {};

    if (userKey) {
      where.user_id = userKey;
    }

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
      ],
      include: [statusInclude],
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
   */
  private async findTaskWithStatusById(id: number, transaction?: Transaction) {
    return this.db.Task.findOne({
      where: { id },
      include: [
        {
          model: this.db.Status,
          as: "status",
          attributes: ["id", "name", "is_final", "is_system", "workspace_id"],
        },
      ],
      transaction,
    });
  }

  // All three kept as public methods (same names/signatures) so nothing
  // calling this repository needs to change.
  async findOneWithStatus(id: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, transaction);
  }

  async findByIdWithStatusJoin(id: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, transaction);
  }

  async findOneWithStatusAlias(id: number, transaction?: Transaction) {
    return this.findTaskWithStatusById(id, transaction);
  }

  async findById(id: number, transaction?: Transaction) {
    return this.db.Task.findOne({ where: { id }, transaction });
  }

  async updateById(
    id: number,
    data: Record<string, unknown>,
    transaction?: Transaction,
  ) {
    return this.db.Task.update(data, { where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Task.destroy({ where: { id }, transaction });
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

  async findAllForUserWithStatus(userId: number, transaction?: Transaction) {
    return this.db.Task.findAll({
      where: { user_id: userId },
      include: [{ model: this.db.Status, as: "status" }],
      transaction,
    });
  }

  async findGroupedByStatusForUser(userId: number, transaction?: Transaction) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      where: { user_id: userId },
      include: [{ model: this.db.Status, as: "status" }],
      attributes: ["status_id", [sequelize.literal("COUNT(*)"), "count"]],
      group: "status_id",
      raw: true,
      transaction,
    });
  }

  async findGroupedByPriorityForUser(
    userId: number,
    transaction?: Transaction,
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: ["priority", [sequelize.literal("COUNT(*)"), "count"]],
      where: { user_id: userId },
      group: "priority",
      raw: true,
      transaction,
    });
  }
}