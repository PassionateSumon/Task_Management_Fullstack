/**
 * Single source of truth for the RBAC catalogue.
 *
 * NOTE: `migrations/20260926000001-create-rbac.js` intentionally embeds its own
 * frozen copy of this data. Migrations must be immutable snapshots, so a later
 * edit here can never rewrite history. When adding a permission, add it in BOTH
 * places (or write a new migration) and never mutate an existing one.
 */

export type PermissionSeed = {
  name: string;
  description: string;
};

/**
 * Global permission catalogue. These map one-to-one onto the real modules of
 * this application; nothing here is speculative.
 */
export const PERMISSIONS: readonly PermissionSeed[] = [
  { name: "user.view", description: "View workspace users" },
  { name: "user.create", description: "Create users inside the workspace" },
  {
    name: "user.update",
    description:
      "Administer other workspace users: change their role, activate or deactivate them. Does not cover editing your own profile name, which needs no permission.",
  },
  { name: "user.delete", description: "Delete users from the workspace" },

  { name: "role.view", description: "View roles" },
  { name: "role.create", description: "Create dynamic roles" },
  {
    name: "role.update",
    description: "Update dynamic roles and their permissions",
  },
  { name: "role.delete", description: "Delete dynamic roles" },

  { name: "permission.view", description: "View the permission catalogue" },
  { name: "permission.create", description: "Create custom permissions" },
  { name: "permission.update", description: "Update custom permissions" },
  { name: "permission.delete", description: "Delete custom permissions" },

  { name: "task.view", description: "View tasks" },
  { name: "task.create", description: "Create tasks" },
  { name: "task.update", description: "Update tasks" },
  { name: "task.delete", description: "Delete tasks" },

  { name: "status.view", description: "View statuses" },
  { name: "status.create", description: "Create statuses" },
  { name: "status.update", description: "Update statuses" },
  { name: "status.delete", description: "Delete statuses" },

  {
    name: "dashboard.view.admin",
    description: "View the workspace administration dashboard",
  },
] as const;

export const ALL_PERMISSION_NAMES: readonly string[] = PERMISSIONS.map(
  (p) => p.name
);

/**
 * Permissions the base member role receives.
 *
 * These are deliberately identical to the access every authenticated user had
 * before RBAC existed, so migrating cannot reduce any existing user's rights.
 *
 * `user.update` is deliberately NOT here. The catalogue defines it as "Update
 * user details and role assignments" — an administrative capability, because it
 * gates `PUT /user/assign-role` and `PUT /user/toggle-active/{id}`, which act
 * on *other* users. Granting it to members let any member reassign an admin's
 * role or deactivate the account they are trying to lock out.
 *
 * Editing your own profile name is not an administrative act and is not
 * permission-gated at all: `PUT /user/update` takes the target id from the
 * session rather than the request body, so it can only ever touch the caller.
 * That is exactly the pre-RBAC behaviour (any authenticated user, own row
 * only), which is why removing it from this list loses no access.
 */
export const BASE_MEMBER_PERMISSION_NAMES: readonly string[] = [
  "user.view",
  "task.view",
  "task.create",
  "task.update",
  "task.delete",
  "status.view",
];

/**
 * `task.view` is the bare minimum every ordinary account must hold, because the
 * task board is workspace-wide: it shows every task in the caller's workspace,
 * not only the ones they created or are assigned. An account without it cannot
 * use the application's primary screen at all.
 *
 * WHERE THIS IS ENFORCED, AND WHY NOT SOMEWHERE ELSE
 * -------------------------------------------------
 * It is guaranteed on the DEFAULT role path, not by overriding permission
 * resolution:
 *
 *   - `BASE_MEMBER_PERMISSION_NAMES` (above) includes it, so the seeded `user`
 *     system role grants it;
 *   - `ADMIN_SYSTEM_ROLE_NAME` grants it;
 *   - `POST /auth/signup` creates a workspace and assigns the admin system role;
 *   - `POST /user/create` with no `role_id` assigns the workspace default system
 *     role (above);
 *   - `resolvePermissionNamesForUser` falls back to the system role matching a
 *     user's legacy `user_type` when no `UserRole` row exists, so accounts created
 *     before the RBAC backfill are covered too.
 *
 * Together those cover every creation path, including existing users, with no
 * data migration.
 *
 * An earlier revision instead injected `task.view` into every resolved permission
 * set, to force the guarantee unconditionally. That was rejected: it made
 * `task.view` non-revocable, so the `PermissionGuard.require("task.view")` on
 * `GET /task/all` and `GET /task/single/{id}` could never fail and the guard was
 * dead code. Revoking a permission has to actually revoke it.
 *
 * The one deliberate residual: an admin who explicitly assigns a custom role that
 * omits `task.view` produces an account that gets 403 on the board. That is
 * intentional removal, not an accident, so it is allowed. Role builders should
 * keep `task.view` in the baseline, which is why it sits at the top of the
 * permission picker.
 *
 * Deliberately NOT in the member baseline: `user.update` (administrative), and
 * anything that mutates. Visibility is the baseline; mutation is not.
 */
export const REQUIRED_BASELINE_PERMISSION_NAMES: readonly string[] = ["task.view"];

export type SystemRoleSeed = {
  name: string;
  description: string;
  /** Mirrors the legacy `User.user_type` ENUM; null for dynamic roles. */
  user_type: "admin" | "user" | null;
  permissions: readonly string[];
};

/**
 * System roles seeded into every workspace, mirroring
 * `StatusRepository.seedDefaultsForWorkspace`. `is_system = true` roles are
 * immutable: they cannot be renamed, re-permissioned or deleted.
 */
export const SYSTEM_ROLES: readonly SystemRoleSeed[] = [
  {
    name: "admin",
    description: "Full access inside this workspace",
    user_type: "admin",
    permissions: ALL_PERMISSION_NAMES,
  },
  {
    name: "user",
    description: "Default member role",
    user_type: "user",
    permissions: BASE_MEMBER_PERMISSION_NAMES,
  },
] as const;

export const DEFAULT_SYSTEM_ROLE_NAME = "user";
export const ADMIN_SYSTEM_ROLE_NAME = "admin";

/**
 * Fail fast at import time if a system role ever stops granting the baseline.
 *
 * Every system role is the DEFAULT role for its tier, and every account created
 * without an explicit role lands on one of them. If `task.view` were dropped from
 * a seed here, every account created from then on would be locked out of the
 * task board -- the app's primary screen -- with no error message explaining why,
 * because the `task.view` guard would simply return 403 forever.
 *
 * A throw at module load is the cheapest possible place to catch that: it fails
 * on the developer's machine and in CI, instead of in production for real users.
 */
for (const seed of SYSTEM_ROLES) {
  const missing = REQUIRED_BASELINE_PERMISSION_NAMES.filter(
    (name) => !seed.permissions.includes(name)
  );
  if (missing.length > 0) {
    throw new Error(
      `System role "${seed.name}" is missing required baseline permission(s): ` +
        `${missing.join(", ")}. Every system role must grant the baseline, ` +
        `because it is the default role for its tier.`
    );
  }
}

export const isKnownPermission = (name: string): boolean =>
  ALL_PERMISSION_NAMES.includes(name);
