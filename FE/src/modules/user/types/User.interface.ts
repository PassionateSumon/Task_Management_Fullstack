export interface UserState {
  user: object;
  workspaceUsers: Array<{ id: number; name: string; email?: string; isActive?: boolean; user_type?: string }>;
  loading: boolean;
  error: string | null;
}
