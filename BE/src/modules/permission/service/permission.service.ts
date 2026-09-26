import { statusCodes } from "../../../common/constants/constants.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import type { Transaction } from "sequelize";
import type { PermissionRepository } from "../../../infrastructure/persistence/permission.repository.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";

type OpResult = {
  statusCode: number;
  message: string;
  data: unknown;
};

const ok = (message: string, data: unknown): OpResult => ({
  statusCode: statusCodes.SUCCESS,
  message,
  data,
});

const fail = (statusCode: number, message: string): OpResult => ({
  statusCode,
  message,
  data: null,
});

export class PermissionService {
  constructor(
    private readonly permissions: PermissionRepository,
    private readonly users: UserRepository
  ) {}

  private async requireWorkspaceId(
    userId: number,
    transaction?: Transaction
  ) {
    const workspaceId = await this.users.findWorkspaceIdByUserId(
      userId,
      transaction
    );
    if (workspaceId == null) {
      return {
        error: fail(
          statusCodes.BAD_REQUEST,
          "No workspace assigned to this user"
        ),
      } as const;
    }
    return { workspaceId } as const;
  }

  /**
   * Lists the global system catalogue plus the calling workspace's own custom
   * permissions. Other workspaces' permissions are never returned.
   */
  async getAllPermissions(
    userId: number,
    options?: { search?: string }
  ): Promise<OpResult> {
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const rows = await this.permissions.findAllVisibleToWorkspace(
          ws.workspaceId,
          options,
          transaction
        );

        return ok(
          "Permissions fetched successfully",
          rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            workspace_id: row.workspace_id,
            is_system: Boolean(row.is_system),
          }))
        );
      })) as OpResult;
    } catch (err: any) {
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  /** Creates a workspace-private custom permission. */
  async createPermission(
    userId: number,
    params: { name: string; description?: string }
  ): Promise<OpResult> {
    const { name, description } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const existing = await this.permissions.findOneRawByName(
          name,
          transaction
        );
        if (existing) {
          return fail(
            statusCodes.CONFLICT,
            "Permission name already exists"
          );
        }

        const created = await this.permissions.createRow(
          {
            name,
            description: description ?? null,
            workspace_id: ws.workspaceId,
            // Custom permissions are never system permissions; this is what makes
            // them mutable and deletable while the catalogue stays locked down.
            is_system: false,
          },
          transaction
        );

        return ok("Permission created successfully", {
          id: created.id,
          name: created.name,
          description: created.description,
          workspace_id: created.workspace_id,
          is_system: false,
        });
      })) as OpResult;
    } catch (err: any) {
      if (this.isDuplicateEntryError(err)) {
        return fail(statusCodes.CONFLICT, "Permission name already exists");
      }
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  async updatePermission(
    userId: number,
    params: { id: number; name?: string; description?: string }
  ): Promise<OpResult> {
    const { id, name, description } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const permission = await this.permissions.findOneVisibleToWorkspace(
          id,
          ws.workspaceId,
          transaction
        );
        if (!permission) return fail(statusCodes.NOT_FOUND, "Permission not found");

        if (permission.is_system) {
          return fail(
            statusCodes.PERMISSION_DENIED,
            "System permissions cannot be modified"
          );
        }

        // A custom permission must not be renamed onto a global name, and the
        // global name space stays reserved for the system catalogue.
        if (name !== undefined && name !== permission.name) {
          const taken = await this.permissions.findOneRawByName(
            name,
            transaction
          );
          if (taken) {
            return fail(
              statusCodes.CONFLICT,
              "Permission name already exists"
            );
          }
        }

        const patch: { name?: string; description?: string | null } = {};
        if (name !== undefined) patch.name = name;
        if (description !== undefined) patch.description = description;
        if (Object.keys(patch).length > 0) {
          await this.permissions.updateFields(id, patch, transaction);
        }

        const fresh = await this.permissions.findOneVisibleToWorkspace(
          id,
          ws.workspaceId,
          transaction
        );

        return ok("Permission updated successfully", {
          id: fresh?.id,
          name: fresh?.name,
          description: fresh?.description,
          workspace_id: fresh?.workspace_id,
          is_system: Boolean(fresh?.is_system),
        });
      })) as OpResult;
    } catch (err: any) {
      if (this.isDuplicateEntryError(err)) {
        return fail(statusCodes.CONFLICT, "Permission name already exists");
      }
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  /**
   * Deletes a custom permission. `RolePermission` rows cascade at the DB level.
   * System permissions are rejected here in the domain layer, so a hand-crafted
   * request cannot bypass the UI.
   */
  async deletePermission(
    userId: number,
    params: { id: number }
  ): Promise<OpResult> {
    const { id } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const permission = await this.permissions.findOneVisibleToWorkspace(
          id,
          ws.workspaceId,
          transaction
        );
        if (!permission) return fail(statusCodes.NOT_FOUND, "Permission not found");

        if (permission.is_system) {
          return fail(
            statusCodes.PERMISSION_DENIED,
            "System permissions cannot be deleted"
          );
        }

        await this.permissions.destroyById(id, transaction);
        return ok("Permission deleted successfully", { id });
      })) as OpResult;
    } catch (err: any) {
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  private isDuplicateEntryError(err: any): boolean {
    return (
      err?.name === "SequelizeUniqueConstraintError" ||
      err?.original?.errno === 1062 ||
      err?.errno === 1062
    );
  }
}
