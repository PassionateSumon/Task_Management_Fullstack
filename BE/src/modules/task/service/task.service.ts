import { withTransaction } from "../../../common/utils/transaction.js";
import type { TaskRepository } from "../../../infrastructure/persistence/task.repository.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { IStatusReader } from "../ports/status-reader.port.js";

export class TaskService {
  constructor(
    private readonly tasks: TaskRepository,
    private readonly statusReader: IStatusReader,
    private readonly users: UserRepository,
  ) {}

  async createTask(
    {
      name,
      description,
      status,
      priority,
      start_date,
      end_date,
    }: {
      name: string;
      description?: string;
      status: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
    },
    userId: number,
  ) {
    try {
      if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (endDate < startDate) {
          return {
            statusCode: 400,
            message: "End date cannot be before start date",
            data: null,
          };
        }
      }

      return await withTransaction(async (transaction) => {
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          userId,
          transaction,
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        const status_id = await this.statusReader.findOneByNameInWorkspace(
          status,
          workspaceId,
          transaction,
        );
        if (!status_id) {
          return {
            statusCode: 404,
            message: "Status not found",
            data: null,
          };
        }
        const whereClause = {
          task_name: name,
          status_id,
          user_id: userId,
        };
        const existed = await this.tasks.findDuplicate(
          whereClause,
          transaction,
        );
        if (existed) {
          return {
            statusCode: 409,
            message: "Task already exists",
            data: null,
          };
        }

        const wrappedInput: Record<string, unknown> = {
          task_name: name,
          task_description: description ? description : null,
          user_id: userId,
          status_id: status_id.id,
          priority: priority ? priority : null,
          start_date: start_date ? start_date : null,
          end_date: end_date ? end_date : null,
          completed_date: status_id.is_final ? new Date() : null,
        };

        const result = await this.tasks.create(wrappedInput, transaction);
        if (!result) {
          return {
            statusCode: 400,
            message: "Task creation failed",
            data: null,
          };
        }
        return {
          statusCode: 200,
          message: "Task created successfully",
          data: result,
        };
      });
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async getAllTasks(
    viewType: "kanban" | "compact" | "calendar" | "table" = "compact",
    userId: number,
    roleId: string,
    reqUserId?: string | null,
    options?: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
      priority?: string;
      start_date?: Date;
      end_date?: Date;
      sortBy?: string;
      sortOrder?: string;
    },
  ) {
    try {
      if (viewType !== "table") {
        options = {
          ...options,
          page: undefined,
          limit: undefined,
        };
      }
      const { rows: tasks, count } = await withTransaction(
        async (transaction) => {
          return this.tasks.findAllForUser(
            reqUserId ? reqUserId : userId,
            options,
            transaction,
          );
        },
      );
      if (!tasks)
        return { statusCode: 404, message: "Tasks not found", data: null };

      let result: unknown = {};

      if (reqUserId === null || reqUserId === undefined) {
        if (viewType === "kanban") {
          result = tasks.reduce((acc: any, task: any) => {
            const status = task.status.name;
            if (!acc[status]) {
              acc[status] = [];
            }
            acc[status].push(task);
            return acc;
          }, {});
        } else if (viewType === "calendar") {
          result = tasks.reduce((acc: any, task: any) => {
            const date = task.start_date ? task.start_date : "no-date";
            if (!acc[date]) {
              acc[date] = [];
            }
            acc[date].push(task);
            return acc;
          }, {});
        } else {
          result = tasks;
        }
      } else {
        if (roleId === "admin")
          result = tasks.filter((task: any) => task.user_id === reqUserId);
      }

      let meta: any = {};
      if (viewType === "table") {
        meta =
          options?.page && options?.limit
            ? {
                totalItems: count,
                totalPages: Math.ceil(count / options.limit),
                currentPage: options.page,
                limit: options.limit,
              }
            : undefined;
      }

      return {
        statusCode: 200,
        message: "Tasks fetched successfully",
        data: {
          data: result,
          meta,
        },
      };
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async getSingleTask({ id }: { id: number }) {
    try {
      const result = await withTransaction(async (transaction) => {
        return this.tasks.findOneWithStatus(id, transaction);
      });
      if (!result) {
        return {
          statusCode: 404,
          message: "Task not found",
          data: null,
        };
      }
      return {
        statusCode: 200,
        message: "Task fetched successfully",
        data: result,
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async updateTask(
    id: number,
    {
      name,
      description,
      status,
      priority,
      start_date,
      end_date,
    }: {
      name?: string;
      description?: string;
      status?: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
    },
  ) {
    try {
      return await withTransaction(async (transaction) => {
        const taskRow = await this.tasks.findByIdWithStatusJoin(
          id,
          transaction,
        );
        if (!taskRow) {
          return {
            statusCode: 404,
            message: "Task not found",
            data: null,
          };
        }

        const dateToValidateStart =
          start_date !== undefined ? start_date : taskRow.start_date;
        const dateToValidateEnd =
          end_date !== undefined ? end_date : taskRow.end_date;

        if (dateToValidateStart && dateToValidateEnd) {
          const startDate = new Date(dateToValidateStart);
          const endDate = new Date(dateToValidateEnd);
          if (endDate < startDate) {
            return {
              statusCode: 400,
              message: "End date cannot be before start date",
              data: null,
            };
          }
        }

        const workspaceId = await this.users.findWorkspaceIdByUserId(
          taskRow.user_id,
          transaction,
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "Task owner has no workspace assigned",
            data: null,
          };
        }

        const oldStatus = taskRow.status;
        let status_id = taskRow.status_id;
        let newStatusRow = oldStatus;

        if (status !== undefined) {
          const statusRecord = await this.statusReader.findOneByNameInWorkspace(
            status,
            workspaceId,
            transaction,
          );
          if (!statusRecord) {
            return {
              statusCode: 404,
              message: "Status not found",
              data: null,
            };
          }
          status_id = statusRecord.id;
          newStatusRow = statusRecord;
        }

        let completed_date: Date | null = taskRow.completed_date;
        if (status !== undefined && newStatusRow) {
          if (newStatusRow.is_final) {
            completed_date = new Date();
          } else if (oldStatus?.is_final && !newStatusRow.is_final) {
            completed_date = null;
          }
        }

        const updatedData: Record<string, unknown> = {
          task_name: name ? name : taskRow.task_name,
          task_description: description
            ? description
            : taskRow.task_description,
          status_id: status_id,
          priority: priority !== undefined ? priority : taskRow.priority,
          start_date:
            start_date !== undefined ? start_date : taskRow.start_date,
          end_date: end_date !== undefined ? end_date : taskRow.end_date,
          completed_date,
        };

        await this.tasks.updateById(id, updatedData, transaction);
        const finalRes = await this.tasks.findOneWithStatusAlias(
          id,
          transaction,
        );
        return {
          statusCode: 200,
          message: "Status updated successfully",
          data: finalRes,
        };
      });
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async deleteTask(id: number) {
    try {
      return await withTransaction(async (transaction) => {
        const task = await this.tasks.findById(id, transaction);
        if (!task) {
          return {
            statusCode: 404,
            message: "Task not found",
            data: null,
          };
        }
        await this.tasks.destroyById(id, transaction);
        return {
          statusCode: 200,
          message: "Task deleted successfully",
          data: { id: id },
        };
      });
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }
}
