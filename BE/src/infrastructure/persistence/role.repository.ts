import { Op } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";
import { SYSTEM_ROLES } from "../../common/constants/permissions.js";

const ROLE_ATTRIBUTES = [
  "id",
  "name",
  "description",
  "workspace_id",
  "is_system",
  "user_type",
];

export class RoleRepository {
  constructor(private readonly db: DbRegistry) {}

  /**
   * Idempotently provisions the system roles for a workspace. Mirrors
   * `StatusRepository.seedDefaultsForWorkspace` and is called from signup so a
   * brand-new workspace is immediately usable.
   */
  async seedDefaultsForWorkspace(
    workspaceId: number,
    transaction?: Transaction
  ): Promise<void> {
    for (const seed of SYSTEM_ROLES) {
      const [role] = await this.db.Role.findOrCreate({
        where: { workspace_id: workspaceId, name: seed.name },
        defaults: {
          workspace_id: workspaceId,
          name: seed.name,
          description: seed.description,
          is_system: true,
          user_type: seed.user_type,
        },
        transaction,
      });

      const existing = await this.db.RolePermission.count({
        where: { role_id: role.id },
        transaction,
      });
      if (existing > 0) continue;

      const permissions = await this.db.Permission.findAll({
        where: { name: { [Op.in]: [...seed.permissions] } },
        attributes: ["id"],
        transaction,
      });
      if (permissions.length === 0) continue;

      await this.db.RolePermission.bulkCreate(
        permissions.map((p: any) => ({
          role_id: role.id,
          permission_id: p.id,
        })),
        { transaction }
      );
    }
  }

  /** All roles visible to a workspace, each with its resolved permissions. */
  async findAllForWorkspace(
    workspaceId: number,
    options?: { search?: string },
    transaction?: Transaction
  ) {
    const where: Record<string, unknown> = { workspace_id: workspaceId };

    if (options?.search) {
      where.name = { [Op.like]: `%${options.search}%` };
    }

    const roles = await this.db.Role.findAll({
      where,
      attributes: ROLE_ATTRIBUTES,
      include: [
        {
          model: this.db.Permission,
          as: "permissions",
          attributes: ["id", "name", "is_system"],
          through: { attributes: [] },
        },
      ],
      order: [
        ["is_system", "DESC"],
        ["name", "ASC"],
      ],
      transaction,
    });

    // Flatten to a stable serialisable shape. `distinct` alone is not enough to
    // guarantee one entry per role once permissions are included.
    return roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      workspace_id: role.workspace_id,
      is_system: Boolean(role.is_system),
      user_type: role.user_type,
      permissions: (role.permissions ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        is_system: Boolean(p.is_system),
      })),
    }));
  }

  async findOneById(id: number, transaction?: Transaction) {
    return this.db.Role.findOne({ where: { id }, transaction });
  }

  async findOneByNameInWorkspace(
    name: string,
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Role.findOne({
      where: { name, workspace_id: workspaceId },
      transaction,
    });
  }

  /**
   * Resolves a role for an operation scoped to `workspaceId`. Returns null when
   * the role does not exist OR belongs to another workspace, so callers cannot
   * accidentally distinguish "not found" from "forbidden" across tenants.
   */
  async findOneInWorkspace(
    id: number,
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Role.findOne({
      where: { id, workspace_id: workspaceId },
      transaction,
    });
  }

  async createRow(
    data: {
      name: string;
      description: string | null;
      workspace_id: number;
      is_system: boolean;
      user_type: "admin" | "user" | null;
    },
    transaction?: Transaction
  ) {
    return this.db.Role.create(data, { transaction });
  }

  async updateFields(
    id: number,
    data: { name?: string; description?: string | null },
    transaction?: Transaction
  ) {
    return this.db.Role.update(data, { where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Role.destroy({ where: { id }, transaction });
  }

  // ------------------------------------------------------------ RolePermission

  async getPermissionIdsForRole(
    roleId: number,
    transaction?: Transaction
  ): Promise<number[]> {
    const rows = await this.db.RolePermission.findAll({
      where: { role_id: roleId },
      attributes: ["permission_id"],
      transaction,
    });
    return rows.map((r: any) => r.permission_id);
  }

  /**
   * Replaces a dynamic role's permission set wholesale. Runs inside the caller's
   * transaction so a failure never leaves a role with a partial mapping.
   */
  async replacePermissionsForRole(
    roleId: number,
    permissionIds: number[],
    transaction?: Transaction
  ): Promise<void> {
    await this.db.RolePermission.destroy({
      where: { role_id: roleId },
      transaction,
    });
    if (permissionIds.length === 0) return;

    await this.db.RolePermission.bulkCreate(
      permissionIds.map((permissionId) => ({ role_id: roleId, permission_id: permissionId })),
      { transaction }
    );
  }

  // ------------------------------------------------------------------ UserRole

  async getRoleForUser(userId: number, transaction?: Transaction) {
    const assignment = await this.db.UserRole.findOne({
      where: { user_id: userId },
      include: [
        {
          model: this.db.Role,
          as: "role",
          attributes: ROLE_ATTRIBUTES,
        },
      ],
      transaction,
    });
    return assignment?.role ?? null;
  }

  async findRoleForUserInWorkspace(
    userId: number,
    workspaceId: number,
    transaction?: Transaction
  ) {
    const assignment = await this.db.UserRole.findOne({
      where: { user_id: userId },
      include: [
        {
          model: this.db.Role,
          as: "role",
          attributes: ROLE_ATTRIBUTES,
          required: true,
          where: { workspace_id: workspaceId },
        },
      ],
      transaction,
    });
    return assignment?.role ?? null;
  }

  /**
   * Assigns (or re-assigns) a user's role.
   *
   * Two non-obvious details drive this implementation:
   *
   * 1. It uses the bulk `update()` form. `UserRole` has a composite primary key
   *    of (`user_id`, `role_id`), and Sequelize's instance-level
   *    `instance.update({ role_id })` silently drops primary-key columns from
   *    the generated SET clause -- it resolves successfully with an empty
   *    `_changed` set while writing nothing at all.
   *
   * 2. `affected === 0` does NOT mean "no row exists". MySQL does not count a
   *    matched-but-unchanged row as affected, so re-assigning the role a user
   *    already holds also reports 0. The existence check below distinguishes
   *    "already on this role" (no-op) from "no assignment yet" (insert), which
   *    otherwise produced a duplicate-key error.
   */
  async assignRoleToUser(
    userId: number,
    roleId: number,
    transaction?: Transaction
  ) {
    const [affected] = await this.db.UserRole.update(
      { role_id: roleId },
      { where: { user_id: userId }, transaction }
    );

    if (affected > 0) {
      return this.db.UserRole.findOne({
        where: { user_id: userId },
        transaction,
      });
    }

    const existing = await this.db.UserRole.findOne({
      where: { user_id: userId },
      transaction,
    });
    if (existing) return existing;

    return this.db.UserRole.create(
      { user_id: userId, role_id: roleId },
      { transaction }
    );
  }

  async countUsersWithRole(roleId: number, transaction?: Transaction) {
    return this.db.UserRole.count({ where: { role_id: roleId }, transaction });
  }

  /**
   * Moves every user off `fromRoleId` and onto `toRoleId`. Used when a dynamic
   * role is deleted so no user is left without a role and no dangling reference
   * survives.
   */
  async reassignUsersFromRoleToRole(
    fromRoleId: number,
    toRoleId: number,
    transaction?: Transaction
  ): Promise<number> {
    const [count] = await this.db.UserRole.update(
      { role_id: toRoleId },
      { where: { role_id: fromRoleId }, transaction }
    );
    return count;
  }

  async findUserIdsWithRole(roleId: number, transaction?: Transaction) {
    const rows = await this.db.UserRole.findAll({
      where: { role_id: roleId },
      attributes: ["user_id"],
      transaction,
    });
    return rows.map((r: any) => r.user_id);
  }
}
