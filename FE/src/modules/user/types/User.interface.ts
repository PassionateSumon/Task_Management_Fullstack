export interface WorkspaceUser {
  id: number;
  name: string;
  email?: string;
  isActive?: boolean;
  user_type?: string;
}

export interface UserState {
  user: object;
  workspaceUsers: Array<{
    id: number;
    name: string;
    email?: string;
    isActive?: boolean;
    user_type?: string;
  }>;
  loading: boolean;
  error: string | null;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  /** Optional. The backend falls back to the workspace's default member role. */
  role_id?: number;
}
