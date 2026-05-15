import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";
import type { IStatusReader } from "../../modules/task/ports/status-reader.port.js";

const DEFAULT_WORKSPACE_STATUSES = [
  { name: "Todo", is_system: true, is_final: false },
  { name: "In Progress", is_system: true, is_final: false },
  { name: "Done", is_system: true, is_final: true },
] as const;

export class StatusRepository implements IStatusReader {
  constructor(private readonly db: DbRegistry) {}

  async seedDefaultsForWorkspace(
    workspaceId: number,
    transaction?: Transaction
  ): Promise<void> {
    for (const row of DEFAULT_WORKSPACE_STATUSES) {
      await this.db.Status.findOrCreate({
        where: { workspace_id: workspaceId, name: row.name },
        defaults: {
          workspace_id: workspaceId,
          name: row.name,
          is_system: row.is_system,
          is_final: row.is_final,
        },
        transaction,
      });
    }
  }

  async findOneByNameInWorkspace(
    name: string,
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Status.findOne({
      where: { name, workspace_id: workspaceId },
      transaction,
    });
  }

  async findOneById(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({
      where: { id },
      transaction,
    });
  }

  async findOneRaw(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({ where: { id }, transaction });
  }

  async findAllForWorkspace(
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Status.findAll({
      where: { workspace_id: workspaceId },
      attributes: ["id", "name", "workspace_id", "is_system", "is_final"],
      order: [["id", "ASC"]],
      transaction,
    });
  }

  async createRow(
    data: {
      name: string;
      workspace_id: number;
      is_system: boolean;
      is_final: boolean;
    },
    transaction?: Transaction
  ) {
    return this.db.Status.create(data, { transaction });
  }

  async updateFields(
    id: number,
    data: { name?: string; is_final?: boolean },
    transaction?: Transaction
  ) {
    return this.db.Status.update(data, { where: { id }, transaction });
  }

  async clearIsFinalInWorkspace(
    workspaceId: number,
    exceptId: number | null,
    transaction?: Transaction
  ) {
    const where: Record<string, unknown> = {
      workspace_id: workspaceId,
      is_final: true,
    };
    if (exceptId != null) {
      where.id = { [Op.ne]: exceptId };
    }
    return this.db.Status.update(
      { is_final: false },
      { where, transaction }
    );
  }

  async findFinalInWorkspace(
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Status.findOne({
      where: { workspace_id: workspaceId, is_final: true },
      transaction,
    });
  }

  async findOneAfterUpdate(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({ where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Status.destroy({ where: { id }, transaction });
  }

  async findAllWithTasks(transaction?: Transaction) {
    return this.db.Status.findAll({
      attributes: ["id", "name", "workspace_id", "is_system", "is_final"],
      include: [{ model: this.db.Task, as: "tasks" }],
      transaction,
    });
  }
}
