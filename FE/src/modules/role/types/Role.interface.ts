import type { Permission } from "../../permission/types/Permission.interface";

export interface Role {
  id: number;
  workspace_id: number;
  name: string;
  description?: string | null;
  /** System roles are seeded per workspace and are immutable. */
  is_system: boolean;
  /** Set only on system roles; null for dynamic roles. */
  user_type?: string | null;
  permissions?: Permission[];
  users_count?: number;
}

export interface RoleState {
  roles: Role[];
  /** Permission ids currently ticked in the role editor. */
  selectedPermissions: number[];
  loading: boolean;
  error: string | null;
}

export interface CreateRolePayload {
  name: string;
  description?: string;
  permission_ids: number[];
}

export interface UpdateRolePayload {
  id: number;
  name?: string;
  description?: string;
  permission_ids?: number[];
}
