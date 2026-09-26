import { withTransaction } from "../../../common/utils/transaction.js";
import { toSafeUser } from "../../../common/utils/sequelizePlain.js";
import { PasswordHasher } from "../../../common/utils/PasswordHasher.js";
import { v4 as uuidv4 } from "uuid";
import { DEFAULT_SYSTEM_ROLE_NAME } from "../../../common/constants/permissions.js";
import { USER_TYPE } from "../../../common/constants/constants.js";
import type { UserRepository } from "../../../infrastructure/persistence/user.repository.js";
import type { RoleRepository } from "../../../infrastructure/persistence/role.repository.js";
import type { PermissionRepository } from "../../../infrastructure/persistence/permission.repository.js";

export class UserService {
  constructor(
    private readonly users: UserRepository,
    private readonly roles: RoleRepository,
    private readonly permissions: PermissionRepository
  ) {}

  async getAllUsers(userId: number, options?: { page?: number; limit?: number; search?: string }) {
    try {
      const { rows: users, count } = await withTransaction(async (transaction) => {
        return this.users.findAllUsers(userId, options, transaction);
      });
      if (!users) {
        return {
          statusCode: 404,
          message: "Users not found",
          data: null,
        };
      }
      
      const meta = options?.page && options?.limit ? {
        totalItems: count,
        totalPages: Math.ceil(count / options.limit),
        currentPage: options.page,
        limit: options.limit
      } : undefined;

      return {
        statusCode: 200,
        message: "Users fetched successfully",
        data: {
          data: users,
          meta
        },
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  /**
   * Reads a single user, scoped to the caller's workspace. The workspace comes
   * from the authenticated user, never from the requested `id`, so a foreign
   * workspace's user cannot be read by guessing ids.
   */
  async getSingleUser(id: number | null, userId: number) {
    try {
      const currId = !id ? userId : id;
      const user = await withTransaction(async (transaction) => {
        if (!id) {
          // Self-read: the id comes from the session.
          return this.users.findOneByIdExcludePassword(currId, transaction);
        }
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          userId,
          transaction
        );
        if (workspaceId == null) {
          return null;
        }
        return this.users.findOneByIdInWorkspace(
          currId,
          workspaceId,
          transaction
        );
      });
      if (!user) {
        return {
          statusCode: 404,
          message: "User not found",
          data: null,
        };
      }
      // Flatten the Sequelize instance to its column values *before* stripping
      // sensitive fields. Spreading the instance directly (`{ ...user }`) copies
      // its internal properties instead of its columns, which both blanks out
      // the response (consumers read `user.name` and get undefined) and buries
      // the row one level down inside `dataValues`.
      return {
        statusCode: 200,
        message: "User fetched successfully",
        data: toSafeUser(user),
      };
    } catch (err: any) {
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  async updateDetails(id: number, data: { name: string }) {
    try {
      return await withTransaction(async (transaction) => {
        const existedUser = await this.users.findOneByIdExcludePassword(
          id,
          transaction
        );
        if (!existedUser) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }
        await this.users.updateById(id, data, transaction);
        const finalRes = await this.users.findOneByIdExcludePassword(
          id,
          transaction
        );
        return {
          statusCode: 200,
          message: "User updated successfully",
          data: toSafeUser(finalRes),
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

  /**
   * Toggles a user's active flag, scoped to the caller's workspace.
   * `actingUserId` is the session user; `id` is the target.
   */
  async toggleActive(id: number, actingUserId: number) {
    try {
      return await withTransaction(async (transaction) => {
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          actingUserId,
          transaction
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        const existedUser = await this.users.findOneByIdInWorkspace(
          id,
          workspaceId,
          transaction
        );
        if (!existedUser) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        await this.users.updateById(
          id,
          { isActive: !existedUser.isActive },
          transaction
        );
        const finalRes = await this.users.findOneByIdExcludePassword(
          id,
          transaction
        );
        return {
          statusCode: 200,
          message: "User updated successfully",
          data: toSafeUser(finalRes),
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

  /** Deletes a user, scoped to the caller's workspace. */
  async deleteUser(id: number, actingUserId: number) {
    try {
      return await withTransaction(async (transaction) => {
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          actingUserId,
          transaction
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        const user = await this.users.findOneByIdInWorkspace(
          id,
          workspaceId,
          transaction
        );
        if (!user) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        // Guard against an admin locking themselves out of their own workspace.
        if (id === actingUserId) {
          return {
            statusCode: 400,
            message: "You cannot delete your own account",
            data: null,
          };
        }

        await this.users.destroyById(id, transaction);
        return {
          statusCode: 200,
          message: "User deleted successfully",
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

  // ------------------------------------------------- manual user provisioning

  /**
   * Admin-initiated user creation inside the caller's workspace.
   *
   * - The workspace is taken from the authenticated admin, never from the body.
   * - `role_id` is optional; when omitted the workspace's default system role is
   *   assigned. When supplied it MUST resolve inside the admin's workspace, so
   *   a Workspace A admin cannot hand out a Workspace B role.
   * - `user_type` is derived from the assigned role. Dynamic roles have a null
   *   `user_type`, so they can only ever produce a regular member; only the
   *   system `admin` role can produce the admin tier. This is what makes
   *   privilege escalation through role ids impossible.
   * - User row + role assignment are committed in a single transaction.
   */
  async createUser(
    actingUserId: number,
    payload: {
      name: string;
      email: string;
      password: string;
      role_id?: number;
    }
  ) {
    const { name, email, password, role_id } = payload;

    try {
      return await withTransaction(async (transaction) => {
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          actingUserId,
          transaction
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        // `User.email` is globally unique; enforce it in the application too so
        // the caller gets a clear 409 instead of a raw driver error.
        const emailTaken = await this.users.findByEmail(email, transaction);
        if (emailTaken) {
          return {
            statusCode: 409,
            message: "A user with this email already exists",
            data: null,
          };
        }

        let targetRole = null;
        if (role_id != null) {
          // Workspace-scoped: a role from another workspace is simply not found.
          targetRole = await this.roles.findOneInWorkspace(
            role_id,
            workspaceId,
            transaction
          );
          if (!targetRole) {
            return {
              statusCode: 400,
              message: "Selected role does not exist in this workspace",
              data: null,
            };
          }
        } else {
          targetRole = await this.roles.findOneByNameInWorkspace(
            DEFAULT_SYSTEM_ROLE_NAME,
            workspaceId,
            transaction
          );
          if (!targetRole) {
            return {
              statusCode: 500,
              message:
                "Workspace default role is missing; cannot create user without an explicit role",
              data: null,
            };
          }
        }

        const hashedPassword = await PasswordHasher.hash(password);
        const resolvedUserType = targetRole.user_type ?? USER_TYPE.USER;

        const newUser = await this.users.create(
          {
            name,
            email,
            username: `user_${uuidv4().slice(0, 8)}`,
            password: hashedPassword,
            isActive: true,
            user_type: resolvedUserType,
            is_reset_password: false,
            isOtpVerified: false,
            workspace_id: workspaceId,
          },
          transaction
        );

        await this.roles.assignRoleToUser(
          newUser.id,
          targetRole.id,
          transaction
        );

        return {
          statusCode: 201,
          message: "User created successfully",
          data: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            username: newUser.username,
            user_type: resolvedUserType,
            isActive: newUser.isActive,
            role: {
              id: targetRole.id,
              name: targetRole.name,
              is_system: Boolean(targetRole.is_system),
            },
          },
        };
      });
    } catch (err: any) {
      if (this.isDuplicateEntryError(err)) {
        return {
          statusCode: 409,
          message: "A user with this email already exists",
          data: null,
        };
      }
      return {
        statusCode: 500,
        message: err.message || "Internal server error",
        data: null,
      };
    }
  }

  /**
   * Reassigns a user's role. The target user and the role must both live in the
   * caller's workspace. A role with a null `user_type` (any dynamic role) leaves
   * the user's existing `user_type` tier untouched, so this path can never
   * promote a member into the admin tier.
   */
  async updateUserRole(
    actingUserId: number,
    payload: { id: number; role_id: number }
  ) {
    const { id, role_id } = payload;

    try {
      return await withTransaction(async (transaction) => {
        const workspaceId = await this.users.findWorkspaceIdByUserId(
          actingUserId,
          transaction
        );
        if (workspaceId == null) {
          return {
            statusCode: 400,
            message: "No workspace assigned to this user",
            data: null,
          };
        }

        const targetUser = await this.users.findOneByIdInWorkspace(
          id,
          workspaceId,
          transaction
        );
        if (!targetUser) {
          return {
            statusCode: 404,
            message: "User not found",
            data: null,
          };
        }

        const role = await this.roles.findOneInWorkspace(
          role_id,
          workspaceId,
          transaction
        );
        if (!role) {
          return {
            statusCode: 400,
            message: "Selected role does not exist in this workspace",
            data: null,
          };
        }

        await this.roles.assignRoleToUser(id, role.id, transaction);

        if (role.user_type) {
          await this.users.updateById(
            id,
            { user_type: role.user_type },
            transaction
          );
        }

        return {
          statusCode: 200,
          message: "User role updated successfully",
          data: {
            id,
            role: { id: role.id, name: role.name, is_system: role.is_system },
            user_type: role.user_type ?? targetUser.user_type,
          },
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

  private isDuplicateEntryError(err: any): boolean {
    return (
      err?.name === "SequelizeUniqueConstraintError" ||
      err?.original?.errno === 1062 ||
      err?.errno === 1062
    );
  }
}
