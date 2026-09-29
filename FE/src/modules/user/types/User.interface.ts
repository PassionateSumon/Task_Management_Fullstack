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
  /**
   * True once `getWorkspaceUsers` has succeeded at least once in this session.
   *
   * Distinguishes "we have the member list" from "we have never asked". The
   * task modal needs that difference to load the list lazily -- on first use --
   * instead of on every modal open, which is what used to make the modal wait
   * behind a full-screen loader.
   *
   * `workspaceUsers.length` cannot stand in for this: a workspace with exactly
   * one member (so a non-empty list) and a workspace that legitimately has none
   * are indistinguishable by length alone, and treating "0 rows" as "not
   * loaded" would refetch on every dropdown open forever.
   */
  workspaceUsersLoaded: boolean;
  /**
   * Failure of the member-list fetch specifically.
   *
   * Deliberately not the shared `error` field: six other thunks write that one,
   * so reading it here could surface an unrelated failure ("could not delete
   * user") as the assignee picker's status. Both fields describe the member
   * list, and they are kept as a pair.
   */
  workspaceUsersError: string | null;
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
