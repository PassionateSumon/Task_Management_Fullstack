import { Sequelize } from "sequelize";
import { DataType } from "sequelize-typescript";
import dotenv from "dotenv";
import User from "../models/user.model.js";
import Task from "../models/task.model.js";
import Status from "../models/status.model.js";
import RefreshToken from "../models/refreshToken.model.js";
import Workspace from "../models/workspace.model.js";
import TaskAssignee from "../models/taskAssignee.model.js";
import Role from "../models/role.model.js";
import Permission from "../models/permission.model.js";
import UserRole from "../models/userRole.model.js";
import RolePermission from "../models/rolePermission.model.js";
dotenv.config();

const { DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT } = process.env as any;

export const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST || "localhost",
  port: Number(DB_PORT) || 3306,
  dialect: "mysql",
  logging: false,
});

const db: any = {};
db.sequelize = sequelize;
db.Sequelize = Sequelize;

db.Workspace = Workspace(sequelize, DataType);
db.User = User(sequelize, DataType);
db.Task = Task(sequelize, DataType);
db.Status = Status(sequelize, DataType);
db.RefreshToken = RefreshToken(sequelize, DataType);
db.TaskAssignee = TaskAssignee(sequelize, DataType);
db.Role = Role(sequelize, DataType);
db.Permission = Permission(sequelize, DataType);
db.UserRole = UserRole(sequelize, DataType);
db.RolePermission = RolePermission(sequelize, DataType);

// Setup associations
Object.values(db).forEach((model: any) => {
  if (model?.associate) {
    model.associate(db);
  }
});

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("Connection has been established successfully.");
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

export { db, connectDB };
