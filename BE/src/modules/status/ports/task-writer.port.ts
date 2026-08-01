import type { Transaction } from "sequelize";

/** Cross-module write contract: status removal clears dependent tasks first. */
export interface ITaskWriter {
  deleteTasksByStatusId(
    statusId: number,
    transaction: Transaction
  ): Promise<void>;
}
