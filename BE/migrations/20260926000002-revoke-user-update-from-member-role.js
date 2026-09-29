/**
 * Revokes `user.update` from every system member role.
 *
 * Why: the first RBAC migration granted `user.update` to the base member role on
 * the theory that it meant "edit your own profile". It does not. The catalogue
 * defines it as "Update user details and role assignments", and it is the gate
 * on two administrative routes that act on *other* users:
 *
 *   PUT /user/assign-role       -> change another user's role
 *   PUT /user/toggle-active/{id} -> deactivate another user
 *
 * With `user.update` in the base member set, any member holding only the default
 * role could reassign the workspace admin's role or deactivate the admin
 * account. That is a privilege escalation and a denial of admin access, both
 * reachable with nothing but a normal member session.
 *
 * The corrected split:
 *   - `user.update` stays with administrative roles and keeps guarding the two
 *     routes above;
 *   - editing your own profile name is not permission-gated at all, because
 *     `PUT /user/update` derives its target id from the session rather than from
 *     the payload and so can only ever touch the caller. That is exactly the
 *     pre-RBAC behaviour (any authenticated user, own row only), so no member
 *     loses access they had before.
 *
 * `20260926000001-create-rbac.js` carries the same correction in its frozen
 * seed, so a fresh install never needs this migration; this one exists to repair
 * databases that already ran the original seed.
 *
 * Properties:
 *   - Idempotent. It only deletes grants that match (system role named `user`,
 *     workspace-scoped) plus the permission it is revoking. Re-running removes
 *     nothing more.
 *   - Reversible. `down` is the exact inverse: it re-grants the permission to
 *     every system `user` role, mirroring what the first migration seeded. No
 *     bookkeeping table is needed because the target set is fully determined by
 *     the seed definition, not by this migration's history.
 *   - Scoped. It only ever touches `is_system = 1` roles named `user`.
 *     Administrator roles and every dynamic role are left alone, so a workspace
 *     that deliberately granted `user.update` to a custom role keeps it.
 *   - Non-destructive. No table or column is dropped; only join rows are
 *     removed, and they are recreated by `down`.
 */

const MEMBER_ROLE_NAME = "user";
const ADMIN_ROLE_NAME = "admin";
const TARGET_PERMISSION = "user.update";

const CURRENT_DESCRIPTION =
  "Administer other workspace users: change their role, activate or deactivate them. " +
  "Does not cover editing your own profile name, which needs no permission.";

const PREVIOUS_DESCRIPTION = "Update user details and role assignments";

/** System member roles of the given name, workspace-scoped only. */
const SYSTEM_ROLES_SQL = (roleName) =>
  "SELECT r.id FROM `Role` r " +
  "WHERE r.name = :roleName AND r.is_system = 1 AND r.workspace_id IS NOT NULL";

export async function up(queryInterface) {
  const { sequelize } = queryInterface;
  const QueryTypes = sequelize.QueryTypes;

  const permissionRows = await sequelize.query(
    "SELECT id FROM `Permission` WHERE `name` = :permission LIMIT 1",
    { replacements: { permission: TARGET_PERMISSION }, type: QueryTypes.SELECT }
  );
  const permissionId = permissionRows?.[0]?.id;
  if (permissionId == null) return; // catalogue row missing; nothing to revoke

  // Delete only the member-role grants. The `is_system` + name predicates make
  // this a no-op on a database that was seeded with the corrected seed already.
  await sequelize.query(
    "DELETE rp FROM `RolePermission` rp " +
      "JOIN `Role` r ON r.id = rp.role_id " +
      "WHERE r.name = :roleName AND r.is_system = 1 " +
      "AND r.workspace_id IS NOT NULL AND rp.permission_id = :permissionId",
    {
      replacements: { roleName: MEMBER_ROLE_NAME, permissionId },
    }
  );

  // Keep the catalogue description in step with the corrected meaning, so the
  // Permissions screen does not keep advertising the old, misleading wording.
  await sequelize.query(
    "UPDATE `Permission` SET `description` = :description WHERE `name` = :permission",
    { replacements: { description: CURRENT_DESCRIPTION, permission: TARGET_PERMISSION } }
  );
}

export async function down(queryInterface) {
  const { sequelize } = queryInterface;
  const QueryTypes = sequelize.QueryTypes;

  const permissionRows = await sequelize.query(
    "SELECT id FROM `Permission` WHERE `name` = :permission LIMIT 1",
    { replacements: { permission: TARGET_PERMISSION }, type: QueryTypes.SELECT }
  );
  const permissionId = permissionRows?.[0]?.id;

  if (permissionId != null) {
    // Re-grant to the roles the first migration would have granted it to.
    const memberRoles = await sequelize.query(SYSTEM_ROLES_SQL(MEMBER_ROLE_NAME), {
      replacements: { roleName: MEMBER_ROLE_NAME },
      type: QueryTypes.SELECT,
    });
    for (const role of memberRoles) {
      if (role?.id == null) continue;
      await sequelize.query(
        "INSERT IGNORE INTO `RolePermission` (role_id, permission_id) VALUES (:roleId, :permissionId)",
        { replacements: { roleId: role.id, permissionId } }
      );
    }

    // Safety net: a rollback must never leave an administrative role unable to
    // administer users, even if that grant was removed by hand in the meantime.
    const adminRoles = await sequelize.query(SYSTEM_ROLES_SQL(ADMIN_ROLE_NAME), {
      replacements: { roleName: ADMIN_ROLE_NAME },
      type: QueryTypes.SELECT,
    });
    for (const role of adminRoles) {
      if (role?.id == null) continue;
      await sequelize.query(
        "INSERT IGNORE INTO `RolePermission` (role_id, permission_id) VALUES (:roleId, :permissionId)",
        { replacements: { roleId: role.id, permissionId } }
      );
    }
  }

  await sequelize.query(
    "UPDATE `Permission` SET `description` = :description WHERE `name` = :permission",
    { replacements: { description: PREVIOUS_DESCRIPTION, permission: TARGET_PERMISSION } }
  );
}
