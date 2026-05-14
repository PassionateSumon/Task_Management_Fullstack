import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";
import type { ITaskWriter } from "../../modules/status/ports/task-writer.port.js";

export class TaskRepository implements ITaskWriter {
  constructor(private readonly db: DbRegistry) {}

  async deleteTasksByStatusId(
    statusId: number,
    transaction: Transaction
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
    transaction?: Transaction
  ) {
    return this.db.Task.findOne({
      where: params,
      transaction,
    });
  }

  async create(data: Record<string, unknown>, transaction?: Transaction) {
    return this.db.Task.create(data, { transaction });
  }

  async findAllForUser(
    userKey: number | string | null | undefined,
    transaction?: Transaction
  ) {
    return this.db.Task.findAll({
      where: { user_id: userKey },
      attributes: [
        "id",
        "task_name",
        "task_description",
        "status_id",
        "priority",
        "start_date",
        "end_date",
        "user_id",
      ],
      include: [
        { model: this.db.Status, as: "status", attributes: ["id", "name"] },
      ],
      transaction,
    });
  }

  async findOneWithStatus(id: number, transaction?: Transaction) {
    return this.db.Task.findOne({
      where: { id },
      include: [{ model: this.db.Status, attributes: ["id", "name"] }],
      transaction,
    });
  }

  async findById(id: number, transaction?: Transaction) {
    return this.db.Task.findOne({ where: { id }, transaction });
  }

  async updateById(
    id: number,
    data: Record<string, unknown>,
    transaction?: Transaction
  ) {
    return this.db.Task.update(data, { where: { id }, transaction });
  }

  async findOneWithStatusAlias(id: number, transaction?: Transaction) {
    return this.db.Task.findOne({
      where: { id },
      include: [
        { model: this.db.Status, as: "status", attributes: ["id", "name"] },
      ],
      transaction,
    });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Task.destroy({ where: { id }, transaction });
  }

  /** Dashboard aggregate helpers — same queries as legacy dashboard.service */
  async countAll(transaction?: Transaction) {
    return this.db.Task.count({ transaction });
  }

  async countCompleted(transaction?: Transaction) {
    return this.db.Task.count({
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: { name: { [Op.in]: ["Done", "Completed"] } },
        },
      ],
      transaction,
    });
  }

  async countOverdue(currentDate: Date, transaction?: Transaction) {
    return this.db.Task.count({
      where: { end_date: { [Op.lt]: currentDate } },
      include: [
        {
          model: this.db.Status,
          as: "status",
          where: {
            name: { [Op.notIn]: ["Done", "Completed"] },
          },
        },
      ],
      transaction,
    });
  }

  async findRecentWithUserAndStatus(transaction?: Transaction) {
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
        },
        { model: this.db.Status, as: "status", attributes: ["id", "name"] },
      ],
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
      nest: true,
      transaction,
    });
  }

  async findGroupedByPriority(transaction?: Transaction) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: ["priority", [sequelize.literal("COUNT(*)"), "count"]],
      group: "priority",
      raw: true,
      transaction,
    });
  }

  async findMonthlyTasks(
    currentYear: number,
    transaction?: Transaction
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [
          sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m"),
          "month",
        ],
        [sequelize.literal("COUNT(*)"), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(currentYear, 0, 1),
          [Op.lte]: new Date(
            currentYear,
            11,
            31,
            23,
            59,
            59,
            999
          ),
        },
      },
      group: [sequelize.fn("DATE_FORMAT", sequelize.col("createdAt"), "%Y-%m")],
      raw: true,
      transaction,
    });
  }

  async findWeeklyTasks(
    currentYear: number,
    currentMonth: number,
    transaction?: Transaction
  ) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.fn("YEAR", sequelize.col("createdAt")), "year"],
        [sequelize.fn("WEEK", sequelize.col("createdAt"), 1), "week"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        createdAt: {
          [Op.gte]: new Date(currentYear, currentMonth, 1),
          [Op.lte]: new Date(
            currentYear,
            currentMonth + 1,
            0,
            23,
            59,
            59,
            999
          ),
        },
      },
      group: [
        sequelize.fn("YEAR", sequelize.col("createdAt")),
        sequelize.fn("WEEK", sequelize.col("createdAt"), 1),
      ],
      order: [
        [sequelize.fn("YEAR", sequelize.col("createdAt")), "ASC"],
        [sequelize.fn("WEEK", sequelize.col("createdAt"), 1), "ASC"],
      ],
      raw: true,
      transaction,
    });
  }

  async findYearlyByStartDate(transaction?: Transaction) {
    const { sequelize } = this.db;
    return this.db.Task.findAll({
      attributes: [
        [sequelize.fn("YEAR", sequelize.col("start_date")), "year"],
        [sequelize.fn("COUNT", sequelize.col("id")), "count"],
      ],
      where: {
        start_date: { [Op.ne]: null },
      },
      group: [sequelize.fn("YEAR", sequelize.col("start_date"))],
      raw: true,
      transaction,
    });
  }

  async findTasksPerUser(transaction?: Transaction) {
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
          where: { user_type: "user" },
        },
      ],
      group: ["user.id", "user.name"],
      raw: true,
      transaction,
    });
  }

  async findAvgDurationCompleted(transaction?: Transaction) {
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
              sequelize.col("end_date")
            )
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
          where: { name: { [Op.in]: ["Done", "Completed"] } },
          attributes: [],
        },
      ],
      raw: true,
      transaction,
    });
  }

  async findStatusTrends(thirtyDaysAgo: Date, transaction?: Transaction) {
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
          where: { name: { [Op.in]: ["Done", "Completed"] } },
          attributes: [],
        },
      ],
      group: [sequelize.fn("DATE", sequelize.col("Task.updatedAt"))],
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
    transaction?: Transaction
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
