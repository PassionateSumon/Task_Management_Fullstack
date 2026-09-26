/**
 * Client-side permission helpers.
 *
 * These are strictly a UX affordance: they hide controls the current user
 * cannot use so the interface is not misleading. The backend re-checks every
 * one of these permissions on every request via `PermissionGuard`, so a user who
 * forges or edits this state gains nothing. Never treat a `true` here as an
 * authorization decision.
 */

/** True when the user holds at least one of the listed permissions. */
export function hasAnyPermission(
  permissions: string[] | undefined | null,
  ...required: string[]
): boolean {
  if (!permissions || permissions.length === 0) return false;
  if (required.length === 0) return false;
  return required.some((permission) => permissions.includes(permission));
}

/** True only when the user holds every listed permission. */
export function hasEveryPermission(
  permissions: string[] | undefined | null,
  ...required: string[]
): boolean {
  if (!permissions) return false;
  if (required.length === 0) return false;
  return required.every((permission) => permissions.includes(permission));
}

/**
 * Splits dotted permission names into their module prefix so the editor can
 * group the catalogue, e.g. `task.create` -> `task`.
 */
export function permissionModule(name: string): string {
  const [moduleName] = name.split(".");
  return moduleName || "other";
}

/**
 * Grouping order for the permission picker.
 *
 * Deliberately not alphabetical: the order an admin thinks in is
 * "who can I manage, then what can they manage, then what do they work on",
 * which is users -> roles -> permissions -> tasks -> statuses -> dashboard.
 * A custom workspace permission lands in a trailing `custom` group instead of
 * being interleaved with the system modules.
 */
const PERMISSION_MODULE_ORDER = [
  "user",
  "role",
  "permission",
  "task",
  "status",
  "dashboard",
] as const;

/** Friendly, human-readable label for a permission module. */
const PERMISSION_MODULE_LABELS: Record<string, string> = {
  user: "Users",
  role: "Roles",
  permission: "Permissions",
  task: "Tasks",
  status: "Statuses",
  dashboard: "Dashboard",
  custom: "Custom",
};

/**
 * Display label for a module, e.g. `user` -> `Users`.
 *
 * Anything unrecognised (a workspace-scoped custom permission) is grouped under
 * "Custom" so a role editor never shows a raw `some_module` heading.
 */
export function permissionModuleLabel(name: string): string {
  const key = permissionModule(name);
  return PERMISSION_MODULE_LABELS[key] ?? "Custom";
}

/** Comparator that sorts permission modules into `PERMISSION_MODULE_ORDER`. */
export function comparePermissionModules(a: string, b: string): number {
  const ia = PERMISSION_MODULE_ORDER.indexOf(a as (typeof PERMISSION_MODULE_ORDER)[number]);
  const ib = PERMISSION_MODULE_ORDER.indexOf(b as (typeof PERMISSION_MODULE_ORDER)[number]);
  // Both unknown: alphabetical, so the order is stable between renders.
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  // Unknown modules sort after every known one.
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

/**
 * Action order within a module, so a group reads as a capability progression
 * rather than alphabetically: View, Create, Update, Delete.
 *
 * The catalogue arrives from the database ordered by name, which would render
 * "Tasks" as Create, Delete, Update, View -- opening a group on the ability to
 * destroy something is the wrong first impression.
 */
const PERMISSION_ACTION_ORDER = ["view", "create", "update", "delete"] as const;

/**
 * The action segment of a permission name. Handles the two-segment form
 * `dashboard.view.admin` by taking the first segment after the module.
 */
function permissionAction(name: string): string {
  return name.split(".").slice(1).join(".").split(".")[0] ?? "";
}

/** Comparator that orders two permission names within the same module. */
export function comparePermissionNames(a: string, b: string): number {
  const ia = PERMISSION_ACTION_ORDER.indexOf(
    permissionAction(a) as (typeof PERMISSION_ACTION_ORDER)[number]
  );
  const ib = PERMISSION_ACTION_ORDER.indexOf(
    permissionAction(b) as (typeof PERMISSION_ACTION_ORDER)[number]
  );
  // An unrecognised action (a custom permission) sorts after the known four.
  if (ia === -1 && ib === -1) return a.localeCompare(b);
  if (ia === -1) return 1;
  if (ib === -1) return -1;
  return ia - ib;
}

