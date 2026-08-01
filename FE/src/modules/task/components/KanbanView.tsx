import { useState } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import type { KanbanViewProps } from "../types/Task.interface";
import { updateTask } from "../slices/TaskSlice";
import { toast } from "react-toastify";
import { Edit3, Trash2, Calendar } from "lucide-react";

interface ExtendedKanbanViewProps extends KanbanViewProps {
  statuses: string[];
}

const priorityConfig: Record<string, { label: string; cls: string }> = {
  high: { label: "High", cls: "bg-red-50 text-red-600" },
  medium: { label: "Medium", cls: "bg-orange-50 text-orange-600" },
  low: { label: "Low", cls: "bg-green-50 text-green-700" },
};

const KanbanView = ({
  tasks, loading, error, getStatusStyle, handleOpenModal,
  handleEditTask, handleDeleteTask, dispatch, statuses,
}: ExtendedKanbanViewProps) => {
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);

  const onDragEnd = (result: DropResult) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (source.droppableId !== destination.droppableId) {
      dispatch(updateTask({ id: parseInt(draggableId), payload: { status: destination.droppableId } }))
        .unwrap()
        .catch((err: any) => toast.error(err.message || "Failed to update task status"));
    }
  };

  if (loading && !statuses.length)
    return <p className="text-gray-400 text-center text-sm py-10">Loading tasks...</p>;
  if (error)
    return <p className="text-red-500 text-center text-sm py-10">{error}</p>;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div
        className="flex gap-3 h-full overflow-x-auto pb-2"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#CBD5E0 transparent" }}
      >
        {statuses.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-10 w-full">
            No statuses available.
          </p>
        ) : (
          statuses.map((status) => {
            const tasksInStatus = (tasks[status] || []).filter(
              (t: any) => t && t.id != null
            );
            const { color } = getStatusStyle(status);

            return (
              <Droppable droppableId={status} key={status}>
                {(provided, snapshot) => (
                  <div
                    className={`flex flex-col flex-shrink-0 w-64 rounded-xl transition-colors ${snapshot.isDraggingOver ? "bg-indigo-50/60" : "bg-white/60"
                      }`}
                    style={{ border: `1px solid ${snapshot.isDraggingOver ? "#C7D2F8" : "#E5E7EB"}` }}
                  >
                    {/* Column header */}
                    <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-semibold text-gray-700">{status}</span>
                      </div>
                      <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">
                        {tasksInStatus.length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]"
                      style={{ scrollbarWidth: "thin", scrollbarColor: "#CBD5E0 transparent" }}
                    >
                      {tasksInStatus.length === 0 ? (
                        <div className="flex items-center justify-center h-20 rounded-lg border border-dashed border-gray-200">
                          <p className="text-xs text-gray-300">No tasks</p>
                        </div>
                      ) : (
                        tasksInStatus.map((task: any, index: number) => {
                          const draggableId = task.id.toString();
                          const isHovered = hoveredTask === draggableId;
                          const pCfg = priorityConfig[task.priority?.toLowerCase()] ?? null;

                          return (
                            <Draggable key={draggableId} draggableId={draggableId} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg p-3 border transition-all select-none ${snapshot.isDragging
                                      ? "border-[#5A67D8]/30 shadow-lg rotate-1"
                                      : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                                    }`}
                                  style={{
                                    cursor: snapshot.isDragging ? "grabbing" : "grab",
                                    ...provided.draggableProps.style,
                                  }}
                                  onMouseEnter={() => setHoveredTask(draggableId)}
                                  onMouseLeave={() => setHoveredTask(null)}
                                  onClick={() => handleOpenModal("view", task)}
                                >
                                  {/* Task name + actions */}
                                  <div className="flex items-start justify-between gap-2 mb-2">
                                    <p className="text-sm font-semibold text-gray-800 leading-snug line-clamp-2">
                                      {task.task_name || "Unnamed Task"}
                                    </p>
                                    {isHovered && (
                                      <div className="flex gap-1 flex-shrink-0">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}
                                          className="p-1 rounded-md text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 transition-colors"
                                        >
                                          <Edit3 size={13} />
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id); }}
                                          className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Footer meta */}
                                  <div className="flex items-center justify-between gap-2">
                                    {pCfg ? (
                                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${pCfg.cls}`}>
                                        {pCfg.label}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-gray-300">No priority</span>
                                    )}
                                    {task.start_date && (
                                      <span className="flex items-center gap-1 text-[10px] text-gray-400">
                                        <Calendar size={10} />
                                        {task.start_date.split("T")[0]}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })
        )}
      </div>
    </DragDropContext>
  );
};

export default KanbanView;