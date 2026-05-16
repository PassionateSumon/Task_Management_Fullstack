import { updateTask } from "../slices/TaskSlice";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { ChevronDown, Calendar, Trash2, Edit3 } from "lucide-react";
import type { CollapsedViewProps } from "../types/Task.interface";

const priorityConfig: Record<string, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-red-50 text-red-600" },
  medium: { label: "Medium", cls: "bg-orange-50 text-orange-600" },
  low: { label: "Low", cls: "bg-green-50 text-green-700" },
};

const CollapsedView = ({
  tasks, loading, error, getStatusStyle, handleOpenModal,
  handleEditTask, handleDeleteTask, expandedStatuses, expandedTasks,
  toggleStatus, toggleTask, dispatch,
}: CollapsedViewProps) => {
  const flattenedTasks = !Array.isArray(tasks)
    ? Object.values(tasks).flat()
    : tasks;

  const collapsedColumns = flattenedTasks.reduce((acc: any, task: any) => {
    const status = task.status?.name || "No Status";
    if (!acc[status]) acc[status] = [];
    acc[status].push(task);
    return acc;
  }, {});

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (source.droppableId !== destination.droppableId) {
      dispatch(updateTask({ id: parseInt(draggableId), payload: { status: destination.droppableId } }));
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm h-full flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-800">All Tasks</h2>
        <span className="text-[10px] font-bold text-[#5A67D8] bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
          {flattenedTasks.length} {flattenedTasks.length === 1 ? "task" : "tasks"}
        </span>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 thin-scrollbar">
        {error && <p className="text-red-500 text-center py-4 text-xs">{error}</p>}
        {loading && !flattenedTasks.length ? (
          <p className="text-gray-400 text-center py-10 text-sm animate-pulse">Loading...</p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            {Object.keys(collapsedColumns).length === 0 ? (
              <p className="text-gray-400 text-center py-10 text-sm">No tasks yet.</p>
            ) : (
              (Object.entries(collapsedColumns) as [string, any[]][]).map(([status, statusTasks]) => {
                const { color } = getStatusStyle(status);
                const isExpanded = expandedStatuses[status];

                return (
                  <Droppable droppableId={status} key={status}>
                    {(provided) => (
                      <div className="" {...provided.droppableProps} ref={provided.innerRef}>

                        {/* Group header */}
                        <button
                          onClick={() => toggleStatus(status)}
                          className="cursor-pointer w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{status}</span>
                            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              {statusTasks.length}
                            </span>
                          </div>
                          <ChevronDown
                            size={14}
                            className={`text-gray-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                          />
                        </button>

                        {/* Task rows */}
                        {isExpanded && (
                          <div className="ml-3 mt-1 mb-2 border-l-2 border-gray-100 pl-3 space-y-1">
                            {statusTasks.map((task: any, index: number) => {
                              const pCfg = priorityConfig[task.priority?.toLowerCase()] ?? null;
                              return (
                                <Draggable key={task.id} draggableId={task.id.toString()} index={index}>
                                  {(provided, snapshot) => (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      {...provided.dragHandleProps}
                                      className={`bg-white rounded-lg border px-3 py-2.5 transition-all ${snapshot.isDragging
                                          ? "border-[#5A67D8]/30 shadow-md"
                                          : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                                        }`}
                                    >
                                      {/* Row: name + actions */}
                                      <div
                                        className="flex items-center justify-between gap-2 cursor-pointer"
                                        onClick={() => toggleTask(task.id.toString())}
                                      >
                                        <span
                                          className="text-sm font-semibold text-gray-800 truncate"
                                          onClick={(e) => { e.stopPropagation(); handleOpenModal("view", task); }}
                                        >
                                          {task.task_name}
                                        </span>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                          {pCfg && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pCfg.cls}`}>
                                              {pCfg.label}
                                            </span>
                                          )}
                                          <ChevronDown
                                            size={13}
                                            className={`text-gray-300 transition-transform duration-200 ${expandedTasks[task.id.toString()] ? "rotate-180" : ""
                                              }`}
                                          />
                                        </div>
                                      </div>

                                      {/* Expanded detail */}
                                      {expandedTasks[task.id.toString()] && (
                                        <div className="mt-3 pt-3 border-t border-gray-50 space-y-2">
                                          {task.task_description && (
                                            <p className="text-xs text-gray-400 leading-relaxed line-clamp-3">
                                              {task.task_description}
                                            </p>
                                          )}
                                          {task.end_date && (
                                            <div className="flex items-center gap-1.5 text-xs text-gray-400">
                                              <Calendar size={11} />
                                              {task.end_date.split("T")[0]}
                                            </div>
                                          )}
                                          <div className="flex gap-1.5 justify-end">
                                            <button
                                              onClick={() => handleEditTask(task)}
                                              className="p-1.5 rounded-md text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 transition-colors"
                                            >
                                              <Edit3 size={13} />
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTask(task.id)}
                                              className="p-1.5 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                            >
                                              <Trash2 size={13} />
                                            </button>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </Draggable>
                              );
                            })}
                            {provided.placeholder}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })
            )}
          </DragDropContext>
        )}
      </div>
    </div>
  );
};

export default CollapsedView;