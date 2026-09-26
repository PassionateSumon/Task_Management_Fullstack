import { statusCodes } from "../../../common/constants/constants.js";
import { DEFAULT_SYSTEM_ROLE_NAME } from "../../../common/constants/permissions.js";
import { withTransaction } from "../../../common/utils/transaction.js";
import type { Transaction } from "sequelize";
import type { RoleRepository } from "../../../infrastructure/persistence/role.repository.js";
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

export class RoleService {
  constructor(
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository,
    private readonly users: UserRepository
  ) {}

  /**
   * Resolves the caller's workspace from the authenticated user record. The
   * workspace is NEVER read from the request payload, query or path.
   */
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

  // ------------------------------------------------------------------- reads

  async getAllRoles(
    userId: number,
    options?: { search?: string }
  ): Promise<OpResult> {
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const result = await this.roles.findAllForWorkspace(
          ws.workspaceId,
          options,
          transaction
        );
        return ok("Roles fetched successfully", result);
      })) as OpResult;
    } catch (err: any) {
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  async getRolePermissions(
    userId: number,
    roleId: number
  ): Promise<OpResult> {
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const role = await this.roles.findOneInWorkspace(
          roleId,
          ws.workspaceId,
          transaction
        );
        // Cross-workspace and non-existent ids are both "not found".
        if (!role) return fail(statusCodes.NOT_FOUND, "Role not found");

        const permissionIds = await this.roles.getPermissionIdsForRole(
          roleId,
          transaction
        );
        return ok("Role permissions fetched successfully", {
          id: role.id,
          name: role.name,
          is_system: Boolean(role.is_system),
          permission_ids: permissionIds,
        });
      })) as OpResult;
    } catch (err: any) {
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  // ------------------------------------------------------------------ writes

  async createRole(
    userId: number,
    params: { name: string; description?: string; permission_ids?: number[] }
  ): Promise<OpResult> {
    const { name, description, permission_ids = [] } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const existing = await this.roles.findOneByNameInWorkspace(
          name,
          ws.workspaceId,
          transaction
        );
        if (existing) {
          return fail(
            statusCodes.CONFLICT,
            "Role name already exists in this workspace"
          );
        }

        const validPermissionIds = await this.validatePermissionIds(
          permission_ids,
          ws.workspaceId,
          transaction
        );
        if ("error" in validPermissionIds) return validPermissionIds.error;

        const created = await this.roles.createRow(
          {
            name,
            description: description ?? null,
            workspace_id: ws.workspaceId,
            is_system: false,
            // Dynamic roles never carry a user_type, so assigning one can never
            // escalate a user into the admin tier.
            user_type: null,
          },
          transaction
        );

        if (validPermissionIds.length > 0) {
          await this.roles.replacePermissionsForRole(
            created.id,
            validPermissionIds,
            transaction
          );
        }

        return ok("Role created successfully", {
          id: created.id,
          name: created.name,
          description: created.description,
          workspace_id: created.workspace_id,
          is_system: false,
          user_type: null,
          permissions: validPermissionIds,
        });
      })) as OpResult;
    } catch (err: any) {
      if (this.isDuplicateEntryError(err)) {
        return fail(
          statusCodes.CONFLICT,
          "Role name already exists in this workspace"
        );
      }
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  async updateRole(
    userId: number,
    params: {
      id: number;
      name?: string;
      description?: string;
      permission_ids?: number[];
    }
  ): Promise<OpResult> {
    const { id, name, description, permission_ids } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const role = await this.roles.findOneInWorkspace(
          id,
          ws.workspaceId,
          transaction
        );
        if (!role) return fail(statusCodes.NOT_FOUND, "Role not found");

        // System roles are immutable, enforced here in the domain layer so that
        // a hand-crafted request cannot bypass the UI.
        if (role.is_system) {
          return fail(
            statusCodes.PERMISSION_DENIED,
            "System roles cannot be modified"
          );
        }

        if (name !== undefined && name !== role.name) {
          const nameTaken = await this.roles.findOneByNameInWorkspace(
            name,
            ws.workspaceId,
            transaction
          );
          if (nameTaken && nameTaken.id !== id) {
            return fail(
              statusCodes.CONFLICT,
              "Role name already exists in this workspace"
            );
          }
        }

        let validPermissionIds: number[] | null = null;
        if (permission_ids !== undefined) {
          const validated = await this.validatePermissionIds(
            permission_ids,
            ws.workspaceId,
            transaction
          );
          if ("error" in validated) return validated.error;
          validPermissionIds = validated;
        }

        const patch: { name?: string; description?: string | null } = {};
        if (name !== undefined) patch.name = name;
        if (description !== undefined) patch.description = description;

        if (Object.keys(patch).length > 0) {
          await this.roles.updateFields(id, patch, transaction);
        }
        if (validPermissionIds !== null) {
          await this.roles.replacePermissionsForRole(
            id,
            validPermissionIds,
            transaction
          );
        }

        const fresh = await this.roles.findOneById(id, transaction);
        const finalPermissionIds =
          validPermissionIds ??
          (await this.roles.getPermissionIdsForRole(id, transaction));

        return ok("Role updated successfully", {
          id: fresh?.id,
          name: fresh?.name,
          description: fresh?.description,
          workspace_id: fresh?.workspace_id,
          is_system: Boolean(fresh?.is_system),
          user_type: fresh?.user_type ?? null,
          permissions: finalPermissionIds,
        });
      })) as OpResult;
    } catch (err: any) {
      if (this.isDuplicateEntryError(err)) {
        return fail(
          statusCodes.CONFLICT,
          "Role name already exists in this workspace"
        );
      }
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  /**
   * Deletes a dynamic role.
   *
   * Strategy for assigned users (no dangling references, no orphaned users):
   * every user currently holding the role is reassigned to the workspace's
   * default system role inside the same transaction, then the role is deleted.
   * The number of reassigned users is returned to the caller.
   */
  async deleteRole(userId: number, params: { id: number }): Promise<OpResult> {
    const { id } = params;
    try {
      return (await withTransaction(async (transaction) => {
        const ws = await this.requireWorkspaceId(userId, transaction);
        if ("error" in ws) return ws.error;

        const role = await this.roles.findOneInWorkspace(
          id,
          ws.workspaceId,
          transaction
        );
        if (!role) return fail(statusCodes.NOT_FOUND, "Role not found");

        if (role.is_system) {
          return fail(
            statusCodes.PERMISSION_DENIED,
            "System roles cannot be deleted"
          );
        }

        const fallback = await this.roles.findOneByNameInWorkspace(
          DEFAULT_SYSTEM_ROLE_NAME,
          ws.workspaceId,
          transaction
        );
        if (!fallback) {
          return fail(
            statusCodes.SERVER_ISSUE,
            "Workspace default role is missing; cannot reassign users"
          );
        }

        const reassigned = await this.roles.reassignUsersFromRoleToRole(
          id,
          fallback.id,
          transaction
        );

        // RolePermission and UserRole rows cascade at the DB level.
        await this.roles.destroyById(id, transaction);

        return ok("Role deleted successfully", {
          id,
          reassigned_users: reassigned,
        });
      })) as OpResult;
    } catch (err: any) {
      return fail(
        statusCodes.SERVER_ISSUE,
        err.message || "Internal server error"
      );
    }
  }

  // ----------------------------------------------------------------- helpers

  /**
   * Ensures every requested permission exists and is grantable in this
   * workspace (global, or owned by the same workspace). A permission id from
   * another workspace is rejected rather than silently ignored.
   */
  private async validatePermissionIds(
    permissionIds: number[],
    workspaceId: number,
    transaction?: Transaction
  ): Promise<{ error: OpResult } | number[]> {
    const unique = [...new Set(permissionIds)];
    if (unique.length === 0) return [];

    for (const permissionId of unique) {
      const permission = await this.permissions.findOneVisibleToWorkspace(
        permissionId,
        workspaceId,
        transaction
      );
      if (!permission) {
        return {
          error: fail(
            statusCodes.BAD_REQUEST,
            "One or more permissions are invalid for this workspace"
          ),
        };
      }
    }
    return unique;
  }

  private isDuplicateEntryError(err: any): boolean {
    return (
      err?.name === "SequelizeUniqueConstraintError" ||
      err?.original?.errno === 1062 ||
      err?.errno === 1062
    );
  }
}
