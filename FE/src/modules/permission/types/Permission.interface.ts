export interface Permission {
  id: number;
  name: string;
  description?: string | null;
  /** null => system-wide permission, visible to every workspace. */
  workspace_id?: number | null;
  is_system?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionState {
  permissions: Permission[];
  loading: boolean;
  error: string | null;
}

export interface CreatePermissionPayload {
  name: string;
  description?: string;
}
