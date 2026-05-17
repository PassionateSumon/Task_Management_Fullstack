import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteTask, getAllTasks } from "../slices/TaskSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import TaskModal from "../components/TaskModal";
import { getAllStatuses } from "../../status/slices/StatusSlice";
import KanbanView from "../components/KanbanView";
import CollapsedView from "../components/CollapsedView";
import TableView from "../components/TableView";
import { Plus, LayoutGrid, List, Table as TableIcon } from "lucide-react";

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

const TaskPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { tasks, loading, error } = useSelector((state: RootState) => state.task);
  const { statuses } = useSelector((state: RootState) => state.status);

  const [modalState, setModalState] = useState<{
    isOpen: boolean; mode: "add" | "view" | "edit" | "view-day"; task: any | null;
  }>({ isOpen: false, mode: "add", task: null });

  const [activeView, setActiveView] = useState<"kanban" | "collapsed" | "table">("kanban");
  const [expandedStatuses, setExpandedStatuses] = useState<{ [key: string]: boolean }>({});
  const [expandedTasks, setExpandedTasks] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const viewMap: any = { kanban: "kanban", collapsed: "compact", table: "table" };
    dispatch(getAllTasks({ viewType: viewMap[activeView] }));
  }, [activeView, dispatch]);

  useEffect(() => { dispatch(getAllStatuses()); }, [dispatch]);

  const views = [
    { id: "kanban", label: "Kanban", icon: <LayoutGrid size={14} /> },
    { id: "collapsed", label: "List", icon: <List size={14} /> },
    { id: "table", label: "Table", icon: <TableIcon size={14} /> },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-[#F3F4FE]">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight">Project Board</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage and track your team's progress in real-time.</p>
        </div>
        <button
          onClick={() => setModalState({ isOpen: true, mode: "add", task: null })}
          className="inline-flex items-center gap-1.5 bg-[#5A67D8] hover:bg-[#434190] text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors cursor-pointer active:scale-95 shadow-md shadow-indigo-100"
        >
          <Plus size={15} /> Add Task
        </button>
      </div>

      {/* ── View switcher toolbar ── */}
      <div className="px-6 pb-3 flex-shrink-0">
        <div className="inline-flex bg-white border border-gray-100 rounded-lg p-0.5 shadow-sm">
          {views.map(({ id, label, icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all cursor-pointer ${activeView === id
                  ? "bg-[#5A67D8] text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
            >
              {icon}{label}
            </button>
          ))}
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
          />
        )}
      </div>

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