import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";

export class UserRepository {
  constructor(private readonly db: DbRegistry) {}

  async findByPk(
    id: string | number,
    transaction?: Transaction
  ): Promise<any | null> {
    return this.db.User.findByPk(id, { transaction });
  }

  async findOneById(
    id: string | number,
    transaction?: Transaction
  ): Promise<any | null> {
    return this.db.User.findOne({ where: { id }, transaction });
  }

  async findByEmail(
    email: string,
    transaction?: Transaction
  ): Promise<any | null> {
    return this.db.User.findOne({ where: { email }, transaction });
  }

  async findByEmailOrUsername(
    emailOrUsername: string,
    transaction?: Transaction
  ): Promise<any | null> {
    return this.db.User.findOne({
      where: {
        [Op.or]: [
          { email: emailOrUsername },
          { username: emailOrUsername },
        ],
      },
      transaction,
    });
  }

  async findAllExceptUserId(
    userId: number,
    transaction?: Transaction
  ): Promise<any[]> {
    return this.db.User.findAll({
      attributes: { exclude: ["password"] },
      where: {
        id: { [Op.ne]: userId },
      },
      transaction,
    });
  }

  async findOneByIdExcludePassword(
    id: number | string,
    transaction?: Transaction
  ): Promise<any | null> {
    return this.db.User.findOne({
      where: { id },
      attributes: { exclude: ["password"] },
      transaction,
    });
  }

  async create(data: Record<string, unknown>, transaction?: Transaction) {
    return this.db.User.create(data, { transaction });
  }

  async updateById(
    id: string | number,
    data: Record<string, unknown>,
    transaction?: Transaction
  ) {
    return this.db.User.update(data, { where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.User.destroy({ where: { id }, transaction });
  }

  async countActiveNonAdminUsers(transaction?: Transaction) {
    return this.db.User.count({
      where: { isActive: true, user_type: "user" },
      transaction,
    });
  }

  async findRecentUsersForDashboard(transaction?: Transaction) {
    return this.db.User.findAll({
      attributes: { exclude: ["password", "otp"] },
      where: { user_type: "user" },
      order: [["createdAt", "DESC"]],
      limit: 5,
      raw: true,
      transaction,
    });
  }

  async countUsersWithRecentTaskActivity(
    thirtyDaysAgo: Date,
    transaction?: Transaction
  ) {
    return this.db.User.count({
      where: { user_type: "user" },
      include: [
        {
          model: this.db.Task,
          as: "tasks",
          where: {
            [Op.or]: [
              {
                createdAt: {
                  [Op.gte]: thirtyDaysAgo,
                },
              },
              {
                updatedAt: {
                  [Op.gte]: thirtyDaysAgo,
                },
              },
            ],
          },
          attributes: [],
          required: true,
        },
      ],
      distinct: true,
      transaction,
    });
  }

  async findAllBasicUsersWithActiveFlag(transaction?: Transaction) {
    return this.db.User.findAll({
      where: { user_type: "user" },
      attributes: ["id", "name", "email", "isActive"],
      transaction,
    });
  }
}
