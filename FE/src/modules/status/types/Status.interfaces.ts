export interface Status {
  id: number;
  name: string;
  workspace_id?: number;
  is_system?: boolean;
  is_final?: boolean;
}

export interface StatusState {
  statuses: Status[];
  loading: boolean;
  error: string | null;
}
