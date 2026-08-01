import { useState, useEffect, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteTask, getAllTasks } from "../slices/TaskSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import TaskModal from "../components/TaskModal";
import { getAllStatuses } from "../../status/slices/StatusSlice";
import KanbanView from "../components/KanbanView";
import CollapsedView from "../components/CollapsedView";
import TableView from "../components/TableView";
import {
  Plus, LayoutGrid, List, Table as TableIcon,
  X, Search, ChevronDown, SlidersHorizontal,
} from "lucide-react";
import { useDebounce } from "../../../common/utils/CustomDebounce";

const getStatusStyle = (status: string) => {
  const styles: any = {
    "To Do": { color: "#5A67D8", symbol: "📋" },
    "In Progress": { color: "#ED8936", symbol: "⚙️" },
    "Done": { color: "#48BB78", symbol: "✅" },
    "Complete": { color: "#48BB78", symbol: "✅" },
    "Blocked": { color: "#E53E3E", symbol: "🚫" },
  };
  return styles[status] || { color: "#A0AEC0", symbol: "📌" };
};

const PRIORITY_OPTIONS = [
  { value: "high", label: "High", dot: "#E53E3E" },
  { value: "medium", label: "Medium", dot: "#ED8936" },
  { value: "low", label: "Low", dot: "#48BB78" },
];

/* ── Reusable pill-select ── */
interface PillSelectProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string; dot?: string }[];
  icon?: React.ReactNode;
}
const PillSelect = ({ value, onChange, placeholder, options, icon }: PillSelectProps) => {
  const active = !!value;
  return (
    <div
      className={`relative inline-flex items-center gap-1.5 h-8 pl-3 rounded-full border text-xs font-medium transition-all select-none
        ${active
          ? "bg-[#5A67D8] border-[#5A67D8] text-white shadow-sm shadow-indigo-200"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#5A67D8] hover:text-[#5A67D8]"
        }`}
    >
      {icon && <span className={active ? "text-white/80" : "text-gray-400"}>{icon}</span>}

      {/* Select covers the pill but stops before the × button when active */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`absolute top-0 bottom-0 left-0 opacity-0 cursor-pointer ${active ? "right-6" : "right-0"}`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="cursor-pointer">{o.label}</option>
        ))}
      </select>

      <span className="pr-1.5 cursor-pointer">
        {active ? options.find((o) => o.value === value)?.label ?? placeholder : placeholder}
      </span>

      {active ? (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="relative z-10 mr-1.5 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
        >
          <X size={11} />
        </button>
      ) : (
        <span className="mr-2 cursor-pointer">
          <ChevronDown size={11} className="text-gray-400" />
        </span>
      )}
    </div>
  );
};

/* ── Date pill ── */
interface DatePillProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  min?: string;
}
const DatePill = ({ label, value, onChange, min }: DatePillProps) => {
  const active = !!value;
  const inputRef = useRef<HTMLInputElement>(null);

  const openPicker = () => {
    const el = inputRef.current;
    if (!el) return;
    el.showPicker?.();
    el.focus();
  };

  return (
    <div
      onClick={openPicker}
      className={`relative inline-flex items-center gap-1.5 h-8 pl-3 rounded-full border text-xs font-medium transition-all cursor-pointer select-none
        ${active
          ? "bg-[#5A67D8] border-[#5A67D8] text-white shadow-sm shadow-indigo-200"
          : "bg-white border-gray-200 text-gray-600 hover:border-[#5A67D8] hover:text-[#5A67D8]"
        }`}
    >
      {/* Hidden native input — not overlaid, just referenced via ref */}
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        onChange={(e) => onChange(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="absolute opacity-0 w-0 h-0 pointer-events-none"
        tabIndex={-1}
      />

      <span className="whitespace-nowrap">
        {active ? `${label}: ${value}` : label}
      </span>

      {active ? (
        <button
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
          className="relative z-10 mr-1.5 p-0.5 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
        >
          <X size={11} />
        </button>
      ) : (
        <span className="mr-2">
          <ChevronDown size={11} className="text-gray-400" />
        </span>
      )}
    </div>
  );
};

const TaskPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, loading, error, totalPages, totalItems } = useSelector(
    (state: RootState) => state.task
  );
  const { statuses } = useSelector((state: RootState) => state.status);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; mode: "add" | "view" | "edit" | "view-day"; task: any | null;
  }>({ isOpen: false, mode: "add", task: null });

  const [activeView, setActiveView] = useState<"kanban" | "collapsed" | "table">("kanban");
  const [expandedStatuses, setExpandedStatuses] = useState<{ [key: string]: boolean }>({});
  const [expandedTasks, setExpandedTasks] = useState<{ [key: string]: boolean }>({});

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 500);
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState<string>("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC" | "">("");

  const hasActiveFilters = !!(statusFilter || priorityFilter || startDateFilter || endDateFilter);

  const clearFilters = () => {
    setStatusFilter(""); setPriorityFilter("");
    setStartDateFilter(""); setEndDateFilter("");
    setPage(1);
  };

  useEffect(() => {
    const viewMap: any = { kanban: "kanban", collapsed: "compact", table: "table" };
    dispatch(getAllTasks({
      viewType: viewMap[activeView],
      page: activeView === "table" ? page : undefined,
      limit: activeView === "table" ? limit : undefined,
      search: debouncedSearch,
      status: statusFilter,
      priority: priorityFilter,
      start_date: startDateFilter,
      end_date: endDateFilter,
      sortBy: activeView === "table" && sortBy ? sortBy : undefined,
      sortOrder: activeView === "table" && sortOrder ? (sortOrder as "ASC" | "DESC") : undefined,
    }));
  }, [activeView, page, limit, debouncedSearch, statusFilter, priorityFilter, startDateFilter, endDateFilter, sortBy, sortOrder, dispatch]);

  useEffect(() => { dispatch(getAllStatuses()); }, [dispatch]);

  const views = [
    { id: "kanban", label: "Kanban", icon: <LayoutGrid size={14} /> },
    { id: "collapsed", label: "List", icon: <List size={14} /> },
    { id: "table", label: "Table", icon: <TableIcon size={14} /> },
  ] as const;

  const statusOptions = statuses.map((s: any) => ({ value: s.name, label: s.name }));

  return (
    <div className="h-full flex flex-col bg-[#F3F4FE]">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Project Board</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Manage and track your team's progress in real-time.
          </p>
        </div>
        <button
          onClick={() => setModalState({ isOpen: true, mode: "add", task: null })}
          className="inline-flex items-center gap-1.5 bg-[#5A67D8] hover:bg-[#434190] text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-md shadow-indigo-100"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 pb-4 flex-shrink-0 space-y-3">

        {/* Row 1: view switcher + search */}
        <div className="flex flex-wrap gap-3 items-center justify-between">

          {/* View switcher */}
          <div className="inline-flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-sm">
            {views.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer
                  ${activeView === id
                    ? "bg-[#5A67D8] text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
              >
                {icon}{label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative group w-64 max-w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={14} className="text-gray-400 group-focus-within:text-[#5A67D8] transition-colors" />
            </div>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full border border-gray-200 rounded-lg pl-9 pr-8 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#5A67D8] focus:border-transparent transition-all shadow-sm"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Row 2: filter pills */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Label */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest mr-1">
            <SlidersHorizontal size={13} />
            Filters
          </div>

          {/* Divider */}
          <div className="w-px h-5 bg-gray-200" />

          <PillSelect
            value={statusFilter}
            onChange={setStatusFilter}
            placeholder="Status"
            options={statusOptions}
          />

          <PillSelect
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="Priority"
            options={PRIORITY_OPTIONS}
          />

          <DatePill
            label="Start date"
            value={startDateFilter}
            onChange={setStartDateFilter}
          />

          <DatePill
            label="Deadline"
            value={endDateFilter}
            onChange={setEndDateFilter}
            min={startDateFilter || undefined}
          />

          {/* Active filter count badge + clear */}
          {hasActiveFilters && (
            <>
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-[#5A67D8] text-white text-[10px] font-bold">
                {[statusFilter, priorityFilter, startDateFilter, endDateFilter].filter(Boolean).length}
              </div>
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500 transition-colors cursor-pointer ml-1"
              >
                <X size={11} /> Clear all
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="flex-1 min-h-0 px-6 pb-6">
        {activeView === "kanban" && (
          <KanbanView
            tasks={tasks} loading={loading} error={error}
            statuses={statuses.map((s: any) => s.name)}
            getStatusStyle={getStatusStyle}
            handleOpenModal={(m, t) => setModalState({ isOpen: true, mode: m, task: t })}
            handleEditTask={(t) => setModalState({ isOpen: true, mode: "edit", task: t })}
            handleDeleteTask={(id) => dispatch(deleteTask(id))}
            dispatch={dispatch}
          />
        )}
        {activeView === "collapsed" && (
          <CollapsedView
            tasks={tasks} loading={loading} error={error}
            getStatusStyle={getStatusStyle}
            handleOpenModal={(m, t) => setModalState({ isOpen: true, mode: m, task: t })}
            handleEditTask={(t) => setModalState({ isOpen: true, mode: "edit", task: t })}
            handleDeleteTask={(id) => dispatch(deleteTask(id))}
            expandedStatuses={expandedStatuses} expandedTasks={expandedTasks}
            toggleStatus={(s) => setExpandedStatuses(p => ({ ...p, [s]: !p[s] }))}
            toggleTask={(id) => setExpandedTasks(p => ({ ...p, [id]: !p[id] }))}
            dispatch={dispatch}
          />
        )}
        {activeView === "table" && (
          <TableView
            tasks={Array.isArray(tasks) ? tasks : []} loading={loading} error={error}
            getStatusStyle={getStatusStyle}
            handleOpenModal={(m, t) => setModalState({ isOpen: true, mode: m, task: t })}
            handleEditTask={(t) => setModalState({ isOpen: true, mode: "edit", task: t })}
            handleDeleteTask={(id) => dispatch(deleteTask(id))}
            sortBy={sortBy}
            sortOrder={sortOrder || undefined}
            onSort={(field) => {
              if (sortBy === field) {
                if (sortOrder === "ASC") setSortOrder("DESC");
                else if (sortOrder === "DESC") { setSortBy(""); setSortOrder(""); }
                else setSortOrder("ASC");
              } else {
                setSortBy(field);
                setSortOrder("ASC");
              }
            }}
          />
        )}
      </div>

      {/* ── Pagination ── */}
      {activeView === "table" && totalPages && totalPages > 0 ? (
        <div className="px-6 py-4 flex items-center justify-between border-t border-gray-200 bg-white shrink-0 mt-auto shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
          <div className="text-sm text-gray-500">
            Showing{" "}
            <span className="font-semibold text-gray-900">{(page - 1) * limit + 1}</span> to{" "}
            <span className="font-semibold text-gray-900">{Math.min(page * limit, totalItems || 0)}</span> of{" "}
            <span className="font-semibold text-gray-900">{totalItems}</span> results
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page:</span>
              <select
                value={limit}
                onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#5A67D8] bg-white cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={40}>40</option>
                <option value={60}>60</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:bg-gray-50 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm font-medium text-gray-700 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium disabled:opacity-50 disabled:bg-gray-50 hover:bg-gray-50 text-gray-700 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <TaskModal
        isOpen={modalState.isOpen}
        onClose={() => setModalState(p => ({ ...p, isOpen: false }))}
        mode={modalState.mode} task={modalState.task}
        statuses={statuses.map((s: any) => s.name)}
        activeView={activeView}
        handleEditTask={(t) => setModalState({ isOpen: true, mode: "edit", task: t })}
        handleDeleteTask={(id) => dispatch(deleteTask(id))}
        dispatch={dispatch}
      />
    </div>
  );
};

export default TaskPage;