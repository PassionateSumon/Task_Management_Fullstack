import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createTask, getSingleTask, refetchTasks, updateTask } from "../slices/TaskSlice";
import { getWorkspaceUsers } from "../../user/slices/userSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import { toast } from "react-toastify";
import type { ExtendedTaskModalProps } from "../types/Task.interface";
import { X, Calendar, Flag, Tag, Trash2, Edit3, Save, Info } from "lucide-react";
import { Autocomplete, Avatar, Chip, TextField } from "@mui/material";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor, Bold, Essentials, Heading, Indent, IndentBlock,
  Italic, Link, List, MediaEmbed, Paragraph, Table, Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const TaskModal = ({
  isOpen, onClose, mode, task, statuses,
  handleEditTask, handleDeleteTask, permissions,
}: ExtendedTaskModalProps) => {
  const { canCreate, canEdit, canDelete } = permissions;
  const emptyForm = {
    name: "", description: "", status: "", priority: "", assignee_ids: [] as string[], start_date: "", end_date: "",
  };
  const [formData, setFormData] = useState({
    ...emptyForm,
  });

  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.task);
  const { workspaceUsers, loading: workspaceUsersLoading } = useSelector((state: RootState) => state.user);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      dispatch(getWorkspaceUsers());
    }
  }, [dispatch, isOpen]);

  useEffect(() => {
    if (task && (mode === "edit" || mode === "view")) {
      const selectedAssignees = task.assignees?.length
        ? task.assignees.map((assignee) => String(assignee.id))
        : task.assignee?.id
          ? [String(task.assignee.id)]
          : task.assignee_id
            ? [String(task.assignee_id)]
            : [];
      setFormData({
        name: task.task_name || "",
        description: task.task_description || "",
        status: typeof task.status === "string" ? task.status : task.status?.name || "",
        priority: task.priority || "",
        assignee_ids: selectedAssignees,
        start_date: task.start_date ? task.start_date.split("T")[0] : "",
        end_date: task.end_date ? task.end_date.split("T")[0] : "",
      });
    } else {
      setFormData(emptyForm);
    }
  }, [task, mode]);

  useEffect(() => {
    if (!isOpen || mode !== "edit" || !task?.id) return;

    let active = true;
    dispatch(getSingleTask(task.id)).unwrap().then((response: any) => {
      if (!active) return;
      const detail = response?.data ?? response;
      const assignees = detail?.assignees?.length
        ? detail.assignees.map((assignee: any) => String(assignee.id))
        : detail?.assignee?.id
          ? [String(detail.assignee.id)]
          : detail?.assignee_id
            ? [String(detail.assignee_id)]
            : [];
      setFormData({
        name: detail?.task_name || detail?.name || "",
        description: detail?.task_description || detail?.description || "",
        status: typeof detail?.status === "string" ? detail.status : detail?.status?.name || "",
        priority: detail?.priority || "",
        assignee_ids: assignees,
        start_date: detail?.start_date ? String(detail.start_date).split("T")[0] : "",
        end_date: detail?.end_date ? String(detail.end_date).split("T")[0] : "",
      });
    }).catch(() => {
      // The selected list row remains available as a fallback when the detail request fails.
    });

    return () => {
      active = false;
    };
  }, [dispatch, isOpen, mode, task?.id]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) handleOnClose();
    };
    if (isOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleOnClose = () => {
    onClose();
    setFormData(emptyForm);
  };

  const handleSubmit = async () => {
    /* Defence in depth. The surrounding UI already prevents opening this modal
       in a mode the user lacks the permission for, so this should be
       unreachable -- but it is the one place that actually issues the write, so
       it refuses rather than trusting that a button stayed hidden. */
    const allowed =
      mode === "add" ? canCreate : mode === "edit" ? canEdit : false;
    if (!allowed) {
      toast.error("You do not have permission to perform this action");
      return;
    }
    if (!formData.name || !formData.status) { toast.error("Task name and status are required."); return; }
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error("Due date cannot be before start date."); return;
    }
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      status: formData.status,
      priority: (formData.priority as any) || undefined,
      assignee_ids: formData.assignee_ids.map(Number),
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
    };
    if (mode === "add") {
      const result = await dispatch(createTask(payload));
      if (createTask.fulfilled.match(result)) { 
        toast.success("Task created!"); 
      }
    } else if (mode === "edit" && task?.id) {
      const result = await dispatch(updateTask({ id: task.id, payload }));
      if (updateTask.fulfilled.match(result)) { 
        toast.success("Task updated!"); 
      }
    }
    setFormData(emptyForm);
    onClose(); 
    dispatch(refetchTasks()); 
  };

  if (!isOpen) return null;
  const isViewMode = mode === "view";

  const labelCls = "mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500";
  const inputCls = "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-6">
      <div className="absolute inset-0" />

      <div
        ref={modalRef}
        className="relative flex max-h-[calc(100vh-1.5rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/70 bg-white shadow-[0_24px_80px_-24px_rgba(15,23,42,0.45)] sm:max-h-[calc(100vh-3rem)]"
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Edit3 size={17} strokeWidth={2.2} />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-500">Task workspace</p>
              <h2 className="truncate text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                {mode === "add" ? "Create a new task" : mode === "edit" ? "Edit task details" : "Task details"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {mode === "view" ? "Review the task before making changes." : "Keep the details clear so the work stays moving."}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleOnClose}
            aria-label="Close task modal"
            title="Close"
            className="ml-3 flex h-9 w-9 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="thin-scrollbar flex-1 space-y-6 overflow-y-auto bg-slate-50/70 px-5 py-6 sm:px-7">

          {/* Task name */}
          <div>
            <label className={labelCls}>Task Name</label>
            <input
              name="name" type="text" value={formData.name}
              onChange={handleChange} disabled={isViewMode}
              placeholder="What needs to be done?"
              className={inputCls}
            />
          </div>

          {/* Status + Priority */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                <Tag size={12} className="text-indigo-500" /> Status
              </label>
              <select name="status" value={formData.status} onChange={handleChange} disabled={isViewMode} className={inputCls}>
                <option value="">Select...</option>
                {statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                <Flag size={12} className="text-rose-500" /> Priority
              </label>
              <select name="priority" value={formData.priority} onChange={handleChange} disabled={isViewMode} className={inputCls}>
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Assignee */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Assignees</label>
              <span className="text-[11px] font-medium text-slate-400">{formData.assignee_ids.length} selected</span>
            </div>
            <Autocomplete
              multiple
              disableCloseOnSelect
              disablePortal
              options={workspaceUsers}
              value={workspaceUsers.filter((member) => formData.assignee_ids.includes(String(member.id)))}
              onChange={(_, selectedUsers) => setFormData((previous) => ({
                ...previous,
                assignee_ids: selectedUsers.map((member) => String(member.id)),
              }))}
              getOptionLabel={(option) => option.name || option.email || "Unnamed user"}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              loading={workspaceUsersLoading}
              disabled={isViewMode}
              noOptionsText="No workspace members found"
              renderTags={(selected, getTagProps) => selected.map((member, index) => (
                <Chip
                  {...getTagProps({ index })}
                  key={member.id}
                  avatar={<Avatar sx={{ width: 24, height: 24, fontSize: 11 }}>{member.name?.charAt(0).toUpperCase()}</Avatar>}
                  label={member.name}
                  sx={{ borderRadius: 2, bgcolor: "#eef2ff", color: "#3730a3", fontWeight: 600 }}
                />
              ))}
              renderOption={(props, member, { selected }) => (
                <li {...props} key={member.id}>
                  <div className="mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">
                    {member.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{member.name}</p>
                    <p className="truncate text-xs text-slate-400">{member.email || "Workspace member"}</p>
                  </div>
                  <span className={`ml-3 text-xs font-bold ${selected ? "text-indigo-600" : "text-slate-300"}`}>{selected ? "Selected" : "Add"}</span>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder={formData.assignee_ids.length ? "Add another assignee" : "Search workspace members"}
                  size="small"
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      minHeight: 44,
                      borderRadius: "12px",
                      backgroundColor: "#fff",
                      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
                    },
                    "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
                    "& .Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1", borderWidth: 1 },
                  }}
                />
              )}
            />
          </div>

          {/* Start + End date */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>
                <Calendar size={12} className="text-indigo-500" /> Start date
              </label>
              <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} disabled={isViewMode} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                <Calendar size={12} className="text-indigo-500" /> Due date
              </label>
              <input
                name="end_date" type="date" value={formData.end_date}
                onChange={handleChange} disabled={isViewMode || !formData.start_date}
                min={formData.start_date || ""}
                className={inputCls}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>
              <Info size={12} className="text-indigo-500" /> Description
            </label>
            <div className={`overflow-hidden rounded-xl border shadow-sm ${isViewMode ? "border-slate-200 bg-white" : "border-slate-200 bg-white focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all"}`}>
              {isViewMode ? (
                <div
                  className="prose prose-sm min-h-[120px] max-w-none p-4 leading-relaxed text-slate-600"
                  dangerouslySetInnerHTML={{ __html: formData.description }}
                />
              ) : (
                <div className="custom-saas-editor">
                  <CKEditor
                    editor={ClassicEditor}
                    data={formData.description}
                    onChange={(_, editor) => setFormData(p => ({ ...p, description: editor.getData() }))}
                    config={{
                      licenseKey: "GPL",
                      toolbar: ["undo", "redo", "|", "heading", "|", "bold", "italic", "|", "link", "bulletedList", "numberedList"],
                      plugins: [Bold, Essentials, Heading, Indent, IndentBlock, Italic, Link, List, MediaEmbed, Paragraph, Table, Undo],
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-between gap-4 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
          <div>
            {canDelete && (mode === "view" || mode === "edit") && task?.id && (
              <button
                type="button"
                onClick={() => { handleDeleteTask(task.id); onClose(); }}
                className="flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleOnClose}
              className="cursor-pointer rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              {mode === "add" || mode === "edit" ? "Cancel" : "Close"}
            </button>

            {mode === "view" ? (
              /* In view mode the only forward action is "Edit", which needs
                 `task.update`. A viewer gets Close only. */
              canEdit && (
                <button
                  type="button"
                  onClick={() => task && handleEditTask(task)}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
                >
                  <Edit3 size={14} /> Edit
                </button>
              )
            ) : (
              /* `canSubmit` is false in "view-day" mode, which is read-only. */
              (mode === "add" ? canCreate : mode === "edit" ? canEdit : false) && (
                <button
                  type="button"
                  onClick={handleSubmit} disabled={loading}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? (
                    <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                  ) : (
                    <><Save size={14} />{mode === "add" ? "Create" : "Save"}</>
                  )}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;