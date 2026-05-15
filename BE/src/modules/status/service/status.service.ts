import { withTransaction } from "../../../common/utils/transaction.js";
import type { StatusRepository } from "../../../infrastructure/persistence/status.repository.js";
import type { TaskRepository } from "../../../infrastructure/persistence/task.repository.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";

type StatusOpResult = {
  statusCode: number;
  message: string;
  data: unknown;
};

export class StatusService {
  constructor(
    private readonly status: StatusRepository,
    private readonly tasks: TaskRepository,
    private readonly users: UserRepository
  ) {}

  private async requireWorkspaceId(
    userId: string,
    transaction?: import("sequelize").Transaction
  ) {
    const wid = await this.users.findWorkspaceIdByUserId(userId, transaction);
    if (wid == null) {
      return {
        error: {
          statusCode: 400,
          message: "No workspace assigned to this user",
          data: null,
        },
      } as const;
    }
    return { workspaceId: wid } as const;
  }

  async createStatus(
    userId: string,
    params: { name: string; is_final?: boolean }
  ): Promise<StatusOpResult> {
    const { name, is_final = false } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const existed = await this.status.findOneByNameInWorkspace(
          name,
          ws.workspaceId,
          transaction
        );
        if (existed) {
          return {
            statusCode: 409,
            message: "Status already exists in this workspace",
            data: null,
          };
        }

        if (is_final) {
          const prevFinal = await this.status.findFinalInWorkspace(
            ws.workspaceId,
            transaction
          );
          if (prevFinal) {
            await this.tasks.nullCompletedDateForTasksInStatus(
              prevFinal.id,
              transaction
            );
          }
          await this.status.clearIsFinalInWorkspace(
            ws.workspaceId,
            null,
            transaction
          );
        }

        const result = await this.status.createRow(
          {
            name,
            workspace_id: ws.workspaceId,
            is_system: false,
            is_final: Boolean(is_final),
          },
          transaction
        );
        if (!result) {
          return {
            statusCode: 400,
            message: "Status creation failed",
            data: null,
          };
        }
        return {
          statusCode: 200,
          message: "Status created successfully",
          data: result,
        };
      })) as StatusOpResult;
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async getAllStatuses(userId: string): Promise<StatusOpResult> {
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const result = await this.status.findAllForWorkspace(
          ws.workspaceId,
          transaction
        );
        return {
          statusCode: 200,
          message: "Status fetched successfully",
          data: result,
        };
      })) as StatusOpResult;
    } catch {
      return {
        statusCode: 500,
        message: "Internal server error",
        data: null,
      };
    }
  }

  async updateStatus(
    userId: string,
    params: { id: number; name: string; is_final?: boolean }
  ): Promise<StatusOpResult> {
    const { id, name, is_final } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const row = await this.status.findOneRaw(id, transaction);
        if (!row || row.workspace_id !== ws.workspaceId) {
          return {
            statusCode: 404,
            message: "Status not found",
            data: null,
          };
        }

        if (row.is_system && name !== row.name) {
          return {
            statusCode: 403,
            message: "System status name cannot be changed",
            data: null,
          };
        }

        const nameTaken = await this.status.findOneByNameInWorkspace(
          name,
          ws.workspaceId,
          transaction
        );
        if (nameTaken && nameTaken.id !== id) {
          return {
            statusCode: 409,
            message: "Status name already exists in this workspace",
            data: null,
          };
        }

        const wantFinal =
          is_final === undefined ? Boolean(row.is_final) : Boolean(is_final);

        if (wantFinal) {
          const prevFinal = await this.status.findFinalInWorkspace(
            ws.workspaceId,
            transaction
          );
          if (prevFinal && prevFinal.id !== id) {
            await this.tasks.nullCompletedDateForTasksInStatus(
              prevFinal.id,
              transaction
            );
            await this.status.clearIsFinalInWorkspace(
              ws.workspaceId,
              null,
              transaction
            );
          } else {
            await this.status.clearIsFinalInWorkspace(
              ws.workspaceId,
              id,
              transaction
            );
          }
          await this.status.updateFields(
            id,
            { name, is_final: true },
            transaction
          );
        } else {
          if (row.is_final) {
            await this.tasks.nullCompletedDateForTasksInStatus(id, transaction);
          }
          await this.status.updateFields(
            id,
            {
              name,
              is_final: false,
            },
            transaction
          );
        }

        const finalRes = await this.status.findOneAfterUpdate(id, transaction);
        return {
          statusCode: 200,
          message: "Status updated successfully",
          data: finalRes,
        };
      })) as StatusOpResult;
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async deleteStatus(userId: string, params: { id: number }): Promise<StatusOpResult> {
    const { id } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const result = await this.status.findOneRaw(id, transaction);
        if (!result || result.workspace_id !== ws.workspaceId) {
          return {
            statusCode: 404,
            message: "Status not found",
            data: null,
          };
        }

        if (result.is_system) {
          return {
            statusCode: 403,
            message: "System statuses cannot be deleted",
            data: null,
          };
        }

        await this.tasks.deleteTasksByStatusId(id, transaction);
        await this.status.destroyById(id, transaction);

        return {
          statusCode: 200,
          message: "Status deleted successfully",
          data: { id: id },
        };
      })) as StatusOpResult;
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }
}
