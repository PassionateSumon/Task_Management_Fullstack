import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";
import type { IStatusReader } from "../../modules/task/ports/status-reader.port.js";

export class StatusRepository implements IStatusReader {
  constructor(private readonly db: DbRegistry) {}

  async findOneByName(name: string, transaction?: Transaction) {
    return this.db.Status.findOne({
      where: { name },
      transaction,
    });
  }

  async findOneById(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({
      where: { id },
      attributes: ["id", "name"],
      transaction,
    });
  }

  async findOneRaw(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({ where: { id }, transaction });
  }

  async findAllMinimal(transaction?: Transaction) {
    return this.db.Status.findAll({
      attributes: ["id", "name"],
      transaction,
    });
  }

  async findByName(name: string, transaction?: Transaction) {
    return this.db.Status.findOne({ where: { name }, transaction });
  }

  async create(name: string, transaction?: Transaction) {
    return this.db.Status.create({ name }, { transaction });
  }

  async updateName(id: number, name: string, transaction?: Transaction) {
    return this.db.Status.update({ name }, { where: { id }, transaction });
  }

  async findOneAfterUpdate(id: number, transaction?: Transaction) {
    return this.db.Status.findOne({ where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Status.destroy({ where: { id }, transaction });
  }

  async findAllWithTasks(transaction?: Transaction) {
    return this.db.Status.findAll({
      attributes: ["id", "name"],
      include: [{ model: this.db.Task, as: "tasks" }],
      transaction,
    });
  }
}
