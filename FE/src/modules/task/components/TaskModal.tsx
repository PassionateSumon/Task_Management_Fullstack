import { useState, useEffect, useRef, type ChangeEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { createTask, getAllTasks, updateTask } from "../slices/TaskSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import { toast } from "react-toastify";
import type { ExtendedTaskModalProps } from "../types/Task.interface";
import { X, Calendar, Flag, Tag, Trash2, Edit3, Save, Info } from "lucide-react";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import {
  ClassicEditor, Bold, Essentials, Heading, Indent, IndentBlock,
  Italic, Link, List, MediaEmbed, Paragraph, Table, Undo,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";

const TaskModal = ({
  isOpen, onClose, mode, task, statuses, activeView,
  handleEditTask, handleDeleteTask,
}: ExtendedTaskModalProps) => {
  const [formData, setFormData] = useState({
    name: "", description: "", status: "", priority: "", start_date: "", end_date: "",
  });

  const dispatch = useDispatch<AppDispatch>();
  const { loading } = useSelector((state: RootState) => state.task);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (task && (mode === "edit" || mode === "view")) {
      setFormData({
        name: task.task_name || "",
        description: task.task_description || "",
        status: typeof task?.status === "string" ? task.status : task?.status?.name || "",
        priority: task.priority || "",
        start_date: task.start_date ? task.start_date.split("T")[0] : "",
        end_date: task.end_date ? task.end_date.split("T")[0] : "",
      });
    } else {
      setFormData({ name: "", description: "", status: "", priority: "", start_date: "", end_date: "" });
    }
  }, [task, mode]);

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
    setFormData({ name: "", description: "", status: "", priority: "", start_date: "", end_date: "" });
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.status) { toast.error("Task name and status are required."); return; }
    if (formData.start_date && formData.end_date && new Date(formData.end_date) < new Date(formData.start_date)) {
      toast.error("Due date cannot be before start date."); return;
    }
    const payload = {
      name: formData.name,
      description: formData.description || undefined,
      status: formData.status,
      priority: (formData.priority as any) || undefined,
      start_date: formData.start_date || undefined,
      end_date: formData.end_date || undefined,
    };
    const viewType = activeView === "collapsed" ? "compact" : activeView;
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
    setFormData({ name: "", description: "", status: "", priority: "", start_date: "", end_date: "" });
    onClose(); 
    dispatch(getAllTasks({ viewType })); 
  };

  if (!isOpen) return null;
  const isViewMode = mode === "view";

  const labelCls = "text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5";
  const inputCls = "w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[100] p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        ref={modalRef}
        className="relative bg-white rounded-2xl w-full max-w-lg shadow-xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Edit3 size={14} className="text-[#5A67D8]" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              {mode === "add" ? "New Task" : mode === "edit" ? "Edit Task" : "Task Details"}
            </h2>
          </div>
          <button
            onClick={handleOnClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto thin-scrollbar px-6 py-5 space-y-4 flex-1">

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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <Tag size={11} className="text-[#5A67D8]" /> Status
              </label>
              <select name="status" value={formData.status} onChange={handleChange} disabled={isViewMode} className={inputCls}>
                <option value="">Select...</option>
                {statuses.map((s: string) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>
                <Flag size={11} className="text-red-400" /> Priority
              </label>
              <select name="priority" value={formData.priority} onChange={handleChange} disabled={isViewMode} className={inputCls}>
                <option value="">Select...</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Start + End date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>
                <Calendar size={11} /> Start Date
              </label>
              <input name="start_date" type="date" value={formData.start_date} onChange={handleChange} disabled={isViewMode} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>
                <Calendar size={11} /> Deadline
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
              <Info size={11} /> Description
            </label>
            <div className={`rounded-lg border overflow-hidden ${isViewMode ? "bg-[#F3F4FE] border-transparent" : "border-gray-200 focus-within:border-[#5A67D8] transition-colors"}`}>
              {isViewMode ? (
                <div
                  className="p-3 prose prose-sm max-w-none text-gray-600 text-sm min-h-[100px] leading-relaxed"
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
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            {(mode === "view" || mode === "edit") && task?.id && (
              <button
                onClick={() => { handleDeleteTask(task.id); onClose(); }}
                className="flex items-center gap-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 px-3 py-2 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOnClose}
              className="px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {mode === "view" ? (
              <button
                onClick={() => task && handleEditTask(task)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A67D8] hover:bg-[#434190] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Edit3 size={14} /> Edit
              </button>
            ) : (
              <button
                onClick={handleSubmit} disabled={loading}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#5A67D8] hover:bg-[#434190] text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {loading ? (
                  <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving...</>
                ) : (
                  <><Save size={14} />{mode === "add" ? "Create" : "Save"}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;