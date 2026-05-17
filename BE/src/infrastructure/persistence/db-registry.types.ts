import type { Sequelize } from "sequelize";

/** Single-process registry for the one shared Sequelize instance and models. */
export interface DbRegistry {
  sequelize: Sequelize;
  Sequelize: typeof import("sequelize").Sequelize;
  User: any;
  Task: any;
  Status: any;
  RefreshToken: any;
  Workspace: any;
}
