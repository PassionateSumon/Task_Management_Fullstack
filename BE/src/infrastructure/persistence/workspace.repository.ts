import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";

export class WorkspaceRepository {
  constructor(private readonly db: DbRegistry) {}

  async create(
    data: { name: string },
    transaction?: Transaction
  ) {
    return this.db.Workspace.create(data, { transaction });
  }
}
