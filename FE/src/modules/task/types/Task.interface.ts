import type { AppDispatch } from "../../../store/store";

/**
 * Which task mutations the signed-in user is allowed to perform.
 *
 * These are a UX affordance only, resolved once in `TaskPage` from
 * `state.auth.permissions` and threaded down to the views and the modal. Hiding
 * a button the user cannot use is not a security control.
 */
export interface TaskPermissionFlags {
  /** `task.create` -- the "Add Task" button and the modal's Create action. */
  canCreate: boolean;
  /** `task.update` -- edit affordances and moving a card between columns. */
  canEdit: boolean;
  /** `task.delete` -- every destructive affordance. */
  canDelete: boolean;
}

export interface Task {
  id: number;
  task_name: string;
  task_description: string | null;
  status_id: number;
  priority: "high" | "medium" | "low" | null;
  start_date: string | null;
  end_date: string | null;
  assignee_id?: number | null;
  assignee?: { id: number; name: string; email?: string; user_type?: string } | null;
  assignees?: { id: number; name: string; email?: string; user_type?: string }[];
  status: { id: number; name: string };
  date?: Date; // For view-day mode
  tasks?: any[]; // For view-day mode
}

export interface TaskQueryParams {
  viewType?: "kanban" | "compact" | "calendar" | "table";
  /**
   * Removed. The board is workspace-wide, so there is no per-user filter to
   * pass. The backend rejects `id` on `/task/all` now that it is gone from the
   * validation schema.
   */
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC" | "asc" | "desc";
}

export interface TaskState {
  tasks: Task[] | { [key: string]: Task[] }; // For compact, kanban, or calendar views
  currentTask: Task | null;
  loading: boolean;
  error: string | null;
  isUpdatingOrDeleting?: boolean;
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  limit?: number;
  lastQueryParams?: TaskQueryParams;
}

export interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: "add" | "view" | "edit" | "view-day";
  task?: Task | null;
}

export interface ExtendedTaskModalProps extends TaskModalProps {
  activeView: "kanban" | "collapsed" | "calendar" | "table";
  statuses: string[];
  handleEditTask: (task: Task) => void;
  handleDeleteTask: (taskId: number) => void;
  dispatch: AppDispatch;
  /** Gates the Create/Save/Delete/Edit actions inside the modal. */
  permissions: TaskPermissionFlags;
}

export interface KanbanViewProps {
  tasks: any;
  loading: boolean;
  error: string | null;
  statuses: string[];
  getStatusStyle: (status: string) => { color: string; symbol: string };
  handleOpenModal: (mode: "add" | "view" | "edit", task?: any) => void;
  handleEditTask: (task: any) => void;
  handleDeleteTask: (taskId: number) => void;
  dispatch: AppDispatch;
  /** Gates the per-card actions and drag-to-change-status. */
  permissions: TaskPermissionFlags;
}

export interface CollapsedViewProps {
  tasks: any;
  loading: boolean;
  error: string | null;
  getStatusStyle: (status: string) => { color: string; symbol: string };
  handleOpenModal: (mode: "add" | "view" | "edit", task?: any) => void;
  handleEditTask: (task: any) => void;
  handleDeleteTask: (taskId: number) => void;
  expandedStatuses: { [key: string]: boolean };
  expandedTasks: { [key: string]: boolean };
  toggleStatus: (status: string) => void;
  toggleTask: (taskId: string) => void;
  dispatch: AppDispatch;
  /** Gates the per-row actions and drag-to-change-status. */
  permissions: TaskPermissionFlags;
}

export interface CalendarViewProps {
  tasks: any;
  loading: boolean;
  error: string | null;
  handleOpenModal: (mode: "add" | "view" | "edit", task?: any) => void;
  handleEditTask: (task: any) => void;
  setIsDragged: (isDragged: boolean) => void;
}

export interface CalendarViewProps {
  tasks: any;
  loading: boolean;
  error: string | null;
  handleOpenModal: (mode: "add" | "view" | "edit", task?: any) => void;
  handleEditTask: (task: any) => void;
}

export interface TableViewProps {
  tasks: any[];
  loading: boolean;
  error: string | null;
  getStatusStyle: (status: string) => { color: string; symbol: string };
  handleOpenModal: (mode: "add" | "view" | "edit", task?: any) => void;
  handleEditTask: (task: any) => void;
  handleDeleteTask: (taskId: number) => void;
  /** Gates the per-row actions column. */
  permissions: TaskPermissionFlags;
}

// export interface Task {
//   id: number;
//   task_name: string;
//   start_date: string;
//   end_date?: string;
//   description?: string;
//   status?: string;
//   priority?: "high" | "medium" | "low";
// }

export interface TaskSegment {
  task: Task;
  index: number;
  length: number;
  isFirst: boolean;
  isStartOfSegment: boolean;
}
