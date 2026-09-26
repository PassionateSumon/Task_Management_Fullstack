"use strict";

/**
 * Creates the dynamic RBAC tables (Permission, Role, UserRole, RolePermission),
 * seeds the deterministic global permission catalog, seeds the per-workspace
 * system roles, and backfills role assignments for every existing user from
 * their legacy `user_type` ENUM.
 *
 * Design notes:
 *  - Permissions are a GLOBAL catalog (`workspace_id IS NULL` = system owned).
 *    A permission is an application capability, not tenant data, so duplicating
 *    it per workspace would add rows without adding isolation. Tenant isolation
 *    lives in `Role` (workspace scoped) and in the `RolePermission` mapping.
 *    `Permission.workspace_id` stays nullable so a workspace may later define
 *    private permissions; the resolution rule
 *    `workspace_id IS NULL OR workspace_id = role.workspace_id` is enforced by
 *    the application from day one.
 *  - `Role` mirrors the existing `Status` tenancy model exactly
 *    (`workspace_id` + `is_system` + unique per workspace).
 *  - `Role.user_type` mirrors the legacy `User.user_type` ENUM. It is set ONLY on
 *    system roles so that RBAC stays the single source of truth while the legacy
 *    `JWTUtil.verifyRole()` guard keeps working for existing clients.
 *
 * This migration intentionally embeds a frozen literal snapshot of the seed data
 * instead of importing application code: migrations must stay immutable, so a
 * later edit to the application catalogue can never retroactively change what
 * this migration wrote.
 */

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  const now = new Date();

  // ---------------------------------------------------------------- Permission
  await queryInterface.createTable("Permission", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    workspace_id: {
      type: Sequelize.INTEGER,
      allowNull: true,
    },
    is_system: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addConstraint("Permission", {
    fields: ["name"],
    type: "unique",
    name: "uniq_permission_name",
  });

  await queryInterface.addConstraint("Permission", {
    fields: ["workspace_id"],
    type: "foreign key",
    name: "fk_permission_workspace",
    references: { table: "Workspace", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addIndex("Permission", ["workspace_id"], {
    name: "idx_permission_workspace",
  });

  // ---------------------------------------------------------------------- Role
  await queryInterface.createTable("Role", {
    id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    workspace_id: {
      type: Sequelize.INTEGER,
      allowNull: false,
    },
    name: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    description: {
      type: Sequelize.STRING(255),
      allowNull: true,
    },
    is_system: {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    // Mirrors the legacy User.user_type ENUM. Set only for system roles.
    user_type: {
      type: Sequelize.ENUM("admin", "user"),
      allowNull: true,
      defaultValue: null,
    },
    createdAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updatedAt: {
      type: Sequelize.DATE,
      allowNull: false,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
  });

  await queryInterface.addConstraint("Role", {
    fields: ["workspace_id", "name"],
    type: "unique",
    name: "uniq_role_workspace_name",
  });

  await queryInterface.addConstraint("Role", {
    fields: ["workspace_id"],
    type: "foreign key",
    name: "fk_role_workspace",
    references: { table: "Workspace", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addIndex("Role", ["workspace_id"], {
    name: "idx_role_workspace",
  });

  // ------------------------------------------------------------------ UserRole
  await queryInterface.createTable("UserRole", {
    user_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    role_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  });

  // A user belongs to exactly one workspace and therefore holds at most one
  // role. Enforced at the DB level so concurrent requests cannot produce a
  // second, conflicting assignment.
  await queryInterface.addConstraint("UserRole", {
    fields: ["user_id"],
    type: "unique",
    name: "uniq_user_role_user",
  });

  await queryInterface.addConstraint("UserRole", {
    fields: ["user_id"],
    type: "foreign key",
    name: "fk_user_role_user",
    references: { table: "User", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addConstraint("UserRole", {
    fields: ["role_id"],
    type: "foreign key",
    name: "fk_user_role_role",
    references: { table: "Role", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addIndex("UserRole", ["role_id"], {
    name: "idx_user_role_role",
  });

  // ------------------------------------------------------------ RolePermission
  await queryInterface.createTable("RolePermission", {
    role_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
    permission_id: {
      type: Sequelize.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  });

  await queryInterface.addConstraint("RolePermission", {
    fields: ["role_id"],
    type: "foreign key",
    name: "fk_role_permission_role",
    references: { table: "Role", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addConstraint("RolePermission", {
    fields: ["permission_id"],
    type: "foreign key",
    name: "fk_role_permission_permission",
    references: { table: "Permission", field: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  });

  await queryInterface.addIndex("RolePermission", ["permission_id"], {
    name: "idx_role_permission_permission",
  });

  // ================================================================== Seeding
  // Idempotent: safe to run against a database that already holds some of this
  // data (INSERT IGNORE / existence checks rather than blind inserts).

  const ALL_PERMISSIONS = [
    ["user.view", "View workspace users"],
    ["user.create", "Create users inside the workspace"],
    ["user.update", "Administer other workspace users: change their role, activate or deactivate them. Does not cover editing your own profile name, which needs no permission."],
    ["user.delete", "Delete users from the workspace"],
    ["role.view", "View roles"],
    ["role.create", "Create dynamic roles"],
    ["role.update", "Update dynamic roles and their permissions"],
    ["role.delete", "Delete dynamic roles"],
    ["permission.view", "View the permission catalogue"],
    ["permission.create", "Create custom permissions"],
    ["permission.update", "Update custom permissions"],
    ["permission.delete", "Delete custom permissions"],
    ["task.view", "View tasks"],
    ["task.create", "Create tasks"],
    ["task.update", "Update tasks"],
    ["task.delete", "Delete tasks"],
    ["status.view", "View statuses"],
    ["status.create", "Create statuses"],
    ["status.update", "Update statuses"],
    ["status.delete", "Delete statuses"],
    ["dashboard.view.admin", "View the workspace administration dashboard"],
  ];

  // The base member role mirrors the permissions the application already granted
  // implicitly to every authenticated user before RBAC existed. Keeping these
  // identical guarantees no existing user loses access after the migration.
  //
  // `user.update` is intentionally excluded: it is the administrative
  // "manage other users" permission (it gates /user/assign-role and
  // /user/toggle-active/{id}) and granting it to members allowed privilege
  // escalation. Editing one's own profile name is not permission-gated,
  // because that route reads its target id from the session. See
  // migrations/20260926000002-revoke-user-update-from-member-role.js, which
  // applies the same correction to databases seeded by an earlier run.
  const BASE_MEMBER_PERMISSIONS = [
    "user.view",
    "task.view",
    "task.create",
    "task.update",
    "task.delete",
    "status.view",
  ];

  const SYSTEM_ROLES = [
    {
      name: "admin",
      description: "Full access inside this workspace",
      user_type: "admin",
      permissions: ALL_PERMISSIONS.map((p) => p[0]),
    },
    {
      name: "user",
      description: "Default member role",
      user_type: "user",
      permissions: BASE_MEMBER_PERMISSIONS,
    },
  ];

  await queryInterface.bulkInsert(
    "Permission",
    ALL_PERMISSIONS.map(([name, description]) => ({
      name,
      description,
      workspace_id: null,
      is_system: true,
      createdAt: now,
      updatedAt: now,
    })),
    { ignoreDuplicates: true }
  );

  const permissionRows = await queryInterface.sequelize.query(
    "SELECT id, name FROM `Permission`",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );
  const permissionIdByName = new Map(
    permissionRows.map((row) => [row.name, row.id])
  );

  const workspaceRows = await queryInterface.sequelize.query(
    "SELECT id FROM `Workspace`",
    { type: queryInterface.sequelize.QueryTypes.SELECT }
  );

  for (const workspace of workspaceRows) {
    for (const role of SYSTEM_ROLES) {
      await queryInterface.bulkInsert(
        "Role",
        [
          {
            workspace_id: workspace.id,
            name: role.name,
            description: role.description,
            is_system: true,
            user_type: role.user_type,
            createdAt: now,
            updatedAt: now,
          },
        ],
        { ignoreDuplicates: true }
      );

      // bulkInsert's return shape is not portable across dialects, so resolve
      // the id explicitly. INSERT IGNORE makes this correct whether the row was
      // just created or already existed.
      const [resolved] = await queryInterface.sequelize.query(
        "SELECT id FROM `Role` WHERE `workspace_id` = :wid AND `name` = :name LIMIT 1",
        {
          replacements: { wid: workspace.id, name: role.name },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        }
      );
      const roleId = resolved?.id;
      if (!roleId) continue;

      await queryInterface.bulkInsert(
        "RolePermission",
        role.permissions
          .map((name) => permissionIdByName.get(name))
          .filter((id) => typeof id === "number")
          .map((permissionId) => ({ role_id: roleId, permission_id: permissionId })),
        { ignoreDuplicates: true }
      );
    }
  }

  // -------------------------------------------------------------- Backfilling
  // Give every existing user the system role matching their legacy user_type so
  // their effective permissions are unchanged by this migration.
  // `super_admin` maps onto the workspace `admin` role: it is a platform tier,
  // not a separate workspace role, and this app has no cross-workspace screens.
  await queryInterface.sequelize.query(
    `INSERT IGNORE INTO \`UserRole\` (user_id, role_id)
     SELECT u.id, r.id
       FROM \`User\` u
       JOIN \`Role\` r
         ON r.workspace_id = u.workspace_id
        AND r.name = CASE
              WHEN u.user_type IN ('admin', 'super_admin') THEN 'admin'
              ELSE 'user'
            END
      WHERE u.workspace_id IS NOT NULL`
  );
}

export async function down(queryInterface) {
  await queryInterface.dropTable("RolePermission");
  await queryInterface.dropTable("UserRole");
  await queryInterface.dropTable("Role");
  await queryInterface.dropTable("Permission");
}
