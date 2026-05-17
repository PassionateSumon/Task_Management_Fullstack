import type { Transaction } from "sequelize";

/** Task module resolves status within a workspace boundary. */
export interface IStatusReader {
  findOneByNameInWorkspace(
    name: string,
    workspaceId: number,
    transaction?: Transaction
  ): Promise<any | null>;

  findOneById(id: number, transaction?: Transaction): Promise<any | null>;
}
