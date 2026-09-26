import { statusCodes } from "../../../common/constants/constants.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import { TaskRepositoryV2 } from "../../../infrastructure/persistence/task.repository-v2.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { IStatusReader } from "../ports/status-reader.port.js";

export class TaskService {
  constructor(
    private readonly tasks: TaskRepositoryV2,
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
      assignee_ids = [],
    }: {
      name: string;
      description?: string;
      status: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
      assignee_ids?: number[];
    },
    userId: number,
  ) {
    try {
      if (start_date && end_date) {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);
        if (endDate < startDate) {
          return {
            statusCode: statusCodes.BAD_REQUEST,
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
            statusCode: statusCodes.BAD_REQUEST,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        for (const assigneeId of assignee_ids) {
          const assignee = await this.users.findOneById(assigneeId, transaction);
          if (!assignee) return { statusCode: statusCodes.NOT_FOUND, message: "Assignee not found", data: null };
          if (assignee.workspace_id !== workspaceId) return { statusCode: statusCodes.BAD_REQUEST, message: "All assignees must belong to the same workspace", data: null };
        }

        const status_id = await this.statusReader.findOneByNameInWorkspace(
          status,
          workspaceId,
          transaction,
        );
        if (!status_id) {
          return {
            statusCode: statusCodes.NOT_FOUND,
            message: "Status not found",
            data: null,
          };
        }
        const whereClause = {
          task_name: name,
          status_id,
          workspace_id: workspaceId,
        };
        const existed = await this.tasks.findDuplicate(
          whereClause,
          transaction,
        );
        if (existed) {
          return {
            statusCode: statusCodes.CONFLICT,
            message: "Task already exists",
            data: null,
          };
        }

        const wrappedInput: Record<string, unknown> = {
          task_name: name,
          task_description: description ? description : null,
          // Who created it (kept for audit + the duplicate/author fields).
          user_id: userId,
          // Which workspace owns it -- the tenant key the board query filters on.
          workspace_id: workspaceId,
          assignee_id: assignee_ids[0] ?? null,
          status_id: status_id.id,
          priority: priority ? priority : null,
          start_date: start_date ? start_date : null,
          end_date: end_date ? end_date : null,
          completed_date: status_id.is_final ? new Date() : null,
        };

        const result = await this.tasks.create(wrappedInput, transaction);
        if (!result) {
          return {
            statusCode: statusCodes.BAD_REQUEST,
            message: "Task creation failed",
            data: null,
          };
        }
        await this.tasks.replaceAssignees(result.id, assignee_ids, transaction);
        return {
          statusCode: statusCodes.SUCCESS,
          message: "Task created successfully",
          data: result,
        };
      });
    } catch (err: any) {
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  /**
   * Every task in the caller's workspace.
   *
   * `userId` is used ONLY to derive the caller's workspace server-side. It never
   * scopes the result set. The previous version took a `reqUserId` + `roleId`,
   * fetched `WHERE user_id = caller`, and then post-filtered the result by
   * creator for admins -- so a member got `{}` and an admin got only their own
   * tasks. Neither branch reflected assignment or workspace membership, which is
   * why assigned tasks never reached the assignee's board.
   *
   * `roleId` is retained in the signature (and ignored) so the controller and any
   * other caller keep working; the `task.view` check is now enforced by
   * `PermissionGuard` on the route, which is the single place it happens.
   */
  async getAllTasks(
    viewType: "kanban" | "compact" | "calendar" | "table" = "compact",
    userId: number,
    _roleId?: string,
    _reqUserId?: string | null,
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
        // Only the table view paginates. For the board views returning every
        // task is intentional: a kanban column that silently omits tasks
        // because they fell past a page limit is worse than a longer payload.
        options = {
          ...options,
          page: undefined,
          limit: undefined,
        };
      }

      const workspaceId = await this.users.findWorkspaceIdByUserId(userId);
      if (workspaceId == null) {
        return {
          statusCode: statusCodes.PERMISSION_DENIED,
          message: "No workspace assigned to this account",
          data: null,
        };
      }

      const { rows: tasks, count } = await withTransaction(
        async (transaction) => {
          return this.tasks.findAllInWorkspace(workspaceId, options, transaction);
        },
      );
      if (!tasks)
        return { statusCode: statusCodes.NOT_FOUND, message: "Tasks not found", data: null };

      let result: unknown;

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
        statusCode: statusCodes.SUCCESS,
        message: "Tasks fetched successfully",
        data: {
          data: result,
          meta,
        },
      };
    } catch (err: any) {
      console.error("Error in getAllTasks:", err);
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: "Internal server error",
        data: null,
      };
    }
  }

  /**
   * `callerId` is the authenticated user, used to derive the caller's workspace
   * server-side. The task id may only address a task inside that workspace.
   *
   * The previous version looked the task up by bare id, so any authenticated
   * user could read a task in any workspace by guessing an id -- confirmed live
   * (a workspace-2 admin read a workspace-5 task). A cross-workspace read now
   * returns the same 404 as a genuinely missing task, so this endpoint does not
   * confirm the existence of other tenants' ids.
   */
  async getSingleTask({ id }: { id: number }, callerId: number) {
    try {
      const workspaceId = await this.users.findWorkspaceIdByUserId(callerId);
      if (workspaceId == null) {
        return {
          statusCode: statusCodes.PERMISSION_DENIED,
          message: "No workspace assigned to this account",
          data: null,
        };
      }

      const result = await withTransaction(async (transaction) => {
        return this.tasks.findOneWithStatus(id, workspaceId, transaction);
      });
      if (!result) {
        return {
          statusCode: statusCodes.NOT_FOUND,
          message: "Task not found",
          data: null,
        };
      }
      return {
        statusCode: statusCodes.SUCCESS,
        message: "Task fetched successfully",
        data: result,
      };
    } catch (err: any) {
      return {
        statusCode: statusCodes.SERVER_ISSUE,
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
      assignee_ids,
    }: {
      name?: string;
      description?: string;
      status?: string;
      priority?: "high" | "medium" | "low";
      start_date?: string;
      end_date?: string;
      assignee_ids?: number[];
    },
    callerId: number,
  ) {
    try {
      // Resolve the CALLER's workspace, not the task creator's. Deriving tenancy
      // from `taskRow.user_id` meant the task decided which tenant the editor
      // belonged to, so any authenticated user could edit a task in any workspace
      // -- confirmed live (a workspace-2 admin renamed a workspace-5 task).
      const callerWorkspaceId = await this.users.findWorkspaceIdByUserId(callerId);
      if (callerWorkspaceId == null) {
        return {
          statusCode: statusCodes.PERMISSION_DENIED,
          message: "No workspace assigned to this account",
          data: null,
        };
      }

      return await withTransaction(async (transaction) => {
        const taskRow = await this.tasks.findByIdWithStatusJoin(
          id,
          callerWorkspaceId,
          transaction,
        );
        if (!taskRow) {
          return {
            statusCode: statusCodes.NOT_FOUND,
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
              statusCode: statusCodes.BAD_REQUEST,
              message: "End date cannot be before start date",
              data: null,
            };
          }
        }

        // The caller's workspace, already resolved above and already proven to
        // own this task. Reusing it keeps the assignee and status lookups inside
        // the same tenant as the task being edited.
        const workspaceId = callerWorkspaceId;

        if (assignee_ids !== undefined) {
          for (const assigneeId of assignee_ids) {
            const assignee = await this.users.findOneById(assigneeId, transaction);
            if (!assignee) return { statusCode: statusCodes.NOT_FOUND, message: "Assignee not found", data: null };
            if (assignee.workspace_id !== workspaceId) return { statusCode: statusCodes.BAD_REQUEST, message: "All assignees must belong to the same workspace", data: null };
          }
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
              statusCode: statusCodes.NOT_FOUND,
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
          assignee_id: assignee_ids !== undefined ? (assignee_ids[0] ?? null) : taskRow.assignee_id,
          status_id: status_id,
          priority: priority !== undefined ? priority : taskRow.priority,
          start_date:
            start_date !== undefined ? start_date : taskRow.start_date,
          end_date: end_date !== undefined ? end_date : taskRow.end_date,
          completed_date,
        };

        await this.tasks.updateById(id, workspaceId, updatedData, transaction);
        if (assignee_ids !== undefined) await this.tasks.replaceAssignees(id, assignee_ids, transaction);
        const finalRes = await this.tasks.findOneWithStatusAlias(
          id,
          workspaceId,
          transaction,
        );
        return {
          statusCode: statusCodes.SUCCESS,
          message: "Task updated successfully",
          data: finalRes,
        };
      });
    } catch (err: any) {
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  /**
   * Scoped to the caller's workspace. The previous bare-`id` lookup let any
   * authenticated user delete any task in any workspace -- confirmed live (a
   * workspace-2 admin deleted a workspace-5 task).
   */
  async deleteTask(id: number, callerId: number) {
    try {
      const workspaceId = await this.users.findWorkspaceIdByUserId(callerId);
      if (workspaceId == null) {
        return {
          statusCode: statusCodes.PERMISSION_DENIED,
          message: "No workspace assigned to this account",
          data: null,
        };
      }

      return await withTransaction(async (transaction) => {
        const task = await this.tasks.findById(id, workspaceId, transaction);
        if (!task) {
          return {
            statusCode: statusCodes.NOT_FOUND,
            message: "Task not found",
            data: null,
          };
        }
        await this.tasks.destroyById(id, workspaceId, transaction);
        return {
          statusCode: statusCodes.SUCCESS,
          message: "Task deleted successfully",
          data: { id: id },
        };
      });
    } catch (err: any) {
      return {
        statusCode: statusCodes.SERVER_ISSUE,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }
}
