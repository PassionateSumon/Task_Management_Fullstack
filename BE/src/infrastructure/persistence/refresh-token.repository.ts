import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";

export class RefreshTokenRepository {
  constructor(private readonly db: DbRegistry) {}

  async create(
    data: { token: string; userId: number },
    transaction?: Transaction
  ) {
    return this.db.RefreshToken.create(data, { transaction });
  }

  async findByTokenWithUser(token: string, transaction?: Transaction) {
    return this.db.RefreshToken.findOne({
      where: { token },
      include: [{ model: this.db.User, as: "user" }],
      transaction,
    });
  }

  async updateToken(
    oldToken: string,
    newToken: string,
    transaction?: Transaction
  ) {
    return this.db.RefreshToken.update(
      { token: newToken },
      { where: { token: oldToken }, transaction }
    );
  }

  async destroyByUserId(userId: string, transaction?: Transaction) {
    return this.db.RefreshToken.destroy({
      where: { userId },
      transaction,
    });
  }

  async findOneByTokenAndUserId(
    token: string,
    userId: string,
    transaction?: Transaction
  ) {
    return this.db.RefreshToken.findOne({
      where: { token, userId },
      transaction,
    });
  }
}
