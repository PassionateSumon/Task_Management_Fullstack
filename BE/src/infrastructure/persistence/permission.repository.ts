import { Op, QueryTypes } from "sequelize";
import type { Transaction } from "sequelize";
import type { DbRegistry } from "./db-registry.types.js";

const PERMISSION_ATTRIBUTES = [
  "id",
  "name",
  "description",
  "workspace_id",
  "is_system",
];

export class PermissionRepository {
  constructor(private readonly db: DbRegistry) {}

  /**
   * Permissions visible to a workspace: the global system catalogue plus any
   * workspace-private custom permissions. This is the only read path exposed to
   * the API, so a workspace can never enumerate another tenant's permissions.
   */
  async findAllVisibleToWorkspace(
    workspaceId: number,
    options?: { search?: string },
    transaction?: Transaction
  ) {
    const where: Record<string, unknown> = {
      [Op.or]: [{ workspace_id: null }, { workspace_id: workspaceId }],
    };

    if (options?.search) {
      where.name = { [Op.like]: `%${options.search}%` };
    }

    return this.db.Permission.findAll({
      where,
      attributes: PERMISSION_ATTRIBUTES,
      order: [
        ["is_system", "DESC"],
        ["name", "ASC"],
      ],
      transaction,
    });
  }

  /**
   * Resolves a permission within the caller's scope. Returns null for a
   * permission owned by a different workspace, so cross-tenant ids are
   * indistinguishable from non-existent ones.
   */
  async findOneVisibleToWorkspace(
    id: number,
    workspaceId: number,
    transaction?: Transaction
  ) {
    return this.db.Permission.findOne({
      where: {
        id,
        [Op.or]: [{ workspace_id: null }, { workspace_id: workspaceId }],
      },
      transaction,
    });
  }

  async findSystemByNames(
    names: string[],
    transaction?: Transaction
  ): Promise<Map<string, any>> {
    if (names.length === 0) return new Map();
    const rows = await this.db.Permission.findAll({
      where: { name: { [Op.in]: names }, workspace_id: null },
      attributes: ["id", "name"],
      transaction,
    });
    return new Map(rows.map((r: any) => [r.name, r]));
  }

  /**
   * Resolves the UNION of effective permission names for a user inside a
   * workspace, in a single round trip:
   *
   *   User -> UserRole -> Role -> RolePermission -> Permission
   *
   * Tenant boundaries are enforced inside the query itself:
   *   - the role must belong to `workspaceId`;
   *   - the permission must be global (`workspace_id IS NULL`) or belong to the
   *     same workspace.
   *
   * Fallback: a user with no `UserRole` row resolves through the workspace's
   * system role that matches their legacy `user_type`. This keeps the system
   * self-healing for rows created before the backfill ran, without ever widening
   * access beyond what that legacy tier already had. `super_admin` maps onto the
   * workspace `admin` system role.
   */
  async resolvePermissionNamesForUser(
    userId: number,
    workspaceId: number,
    transaction?: Transaction
  ): Promise<Set<string>> {
    const rows = (await this.db.sequelize.query(
      `SELECT DISTINCT p.name AS name
         FROM \`Permission\` p
         JOIN \`RolePermission\` rp ON rp.permission_id = p.id
         JOIN \`Role\` r ON r.id = rp.role_id
        WHERE r.workspace_id = :workspaceId
          AND (p.workspace_id IS NULL OR p.workspace_id = :workspaceId)
          AND r.id = COALESCE(
                (SELECT ur.role_id
                   FROM \`UserRole\` ur
                  WHERE ur.user_id = :userId
                  LIMIT 1),
                (SELECT sr.id
                   FROM \`Role\` sr
                  WHERE sr.workspace_id = :workspaceId
                    AND sr.is_system = 1
                    AND sr.user_type = CASE
                          WHEN (SELECT u.user_type FROM \`User\` u WHERE u.id = :userId) = 'super_admin'
                            THEN 'admin'
                          ELSE (SELECT u.user_type FROM \`User\` u WHERE u.id = :userId)
                        END
                  LIMIT 1)
              )`,
      {
        replacements: { userId, workspaceId },
        type: QueryTypes.SELECT,
        transaction,
      }
    )) as unknown as Array<{ name: string }>;

    // NOTE: this returns exactly what the role grants. There is deliberately no
    // "baseline" permissions added on top. An earlier revision injected
    // `task.view` here unconditionally so that no account could be locked out of
    // the workspace board; that made the `task.view` route guard unreachable, so
    // removing the permission from a role had no effect at all and the guard was
    // dead code. `task.view` is a real, revocable permission and the guarantee
    // that ordinary accounts hold it lives where it belongs -- on the seeded
    // system roles (`BASE_MEMBER_PERMISSION_NAMES`). See that constant.
    return new Set<string>((rows ?? []).map((row) => row.name));
  }

  // ------------------------------------------------------------------ CRUD ops

  async createRow(
    data: {
      name: string;
      description: string | null;
      workspace_id: number;
      is_system: boolean;
    },
    transaction?: Transaction
  ) {
    return this.db.Permission.create(data, { transaction });
  }

  async findOneRawByName(name: string, transaction?: Transaction) {
    return this.db.Permission.findOne({ where: { name }, transaction });
  }

  async updateFields(
    id: number,
    data: { name?: string; description?: string | null },
    transaction?: Transaction
  ) {
    return this.db.Permission.update(data, { where: { id }, transaction });
  }

  async destroyById(id: number, transaction?: Transaction) {
    return this.db.Permission.destroy({ where: { id }, transaction });
  }
}
