/**
 * Assignee-picker helpers.
 *
 * Extracted from the task modal so the merge rule can be tested on its own. It
 * is pure and DOM-free, which matters because a mistake here does not crash --
 * it silently hides assignees.
 */

/** The minimum a person needs to be usable as a picker option. */
export interface AssigneeOption {
  id: number;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

/** The assignee-ish shapes a task payload can present. */
export interface TaskAssigneeSource {
  assignees?: Array<{ id: number; name?: string }> | null;
  assignee?: { id: number; name?: string } | null;
  assignee_id?: number | null;
}

export function taskAssigneeOptions(task?: TaskAssigneeSource | null): AssigneeOption[] {
  if (!task) return [];
  if (task.assignees?.length) return task.assignees.filter((a) => a?.id != null);
  if (task.assignee?.id != null) return [task.assignee];
  return [];
}

export function mergeAssigneeOptions(
  members: Array<{ id: number } | null | undefined>,
  taskOptions: Array<{ id: number } | null | undefined>
): AssigneeOption[] {
  const byId = new Map<number, AssigneeOption>();

  for (const member of members) {
    if (member?.id != null) byId.set(member.id, member as AssigneeOption);
  }
  for (const option of taskOptions) {
    if (option?.id != null && !byId.has(option.id)) byId.set(option.id, option as AssigneeOption);
  }

  return Array.from(byId.values());
}
