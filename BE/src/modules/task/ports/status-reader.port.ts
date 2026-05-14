import type { Transaction } from "sequelize";

/** Cross-module read contract: task bounded context resolves status by name/id. */
export interface IStatusReader {
  findOneByName(name: string, transaction?: Transaction): Promise<any | null>;

  findOneById(id: number, transaction?: Transaction): Promise<any | null>;
}
