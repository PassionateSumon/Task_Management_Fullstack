import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { deleteStatus, getAllStatuses } from "../slices/StatusSlice";
import type { AppDispatch, RootState } from "../../../store/store";
import StatusModal from "../components/StatusModal";
import { Plus, Pencil, Trash2, Search, Hash } from "lucide-react";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import type { Status } from "../types/Status.interfaces";

const getStatusColor = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes("pending") || n.includes("wait"))
    return { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" };
  if (n.includes("complete") || n.includes("done") || n.includes("final"))
    return { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (n.includes("block") || n.includes("stop"))
    return { dot: "bg-rose-500", badge: "bg-rose-50 text-rose-700 border-rose-200" };
  if (n.includes("progress") || n.includes("new"))
    return { dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" };
  return { dot: "bg-slate-400", badge: "bg-slate-100 text-slate-600 border-slate-200" };
};

const StatusPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { statuses } = useSelector((state: RootState) => state.status);
  const [searchTerm, setSearchTerm] = useState("");

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    status: Status | null;
  }>({ isOpen: false, mode: "add", status: null });

  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    statusId: number | null;
    statusName: string | null;
    isFinal?: boolean;
  }>({ isOpen: false, statusId: null, statusName: null });

  const [fallbackStatusId, setFallbackStatusId] = useState<number | string>("");

  useEffect(() => {
    dispatch(getAllStatuses());
  }, [dispatch]);

  const filteredStatuses = statuses?.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">Status</h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Scoped to your workspace. Built-in statuses cannot be deleted.
            </p>
          </div>
          <button
            onClick={() => setModalState({ isOpen: true, mode: "add", status: null })}
            className="inline-flex items-center gap-2 bg-[#5A67D8] hover:bg-[#434190] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer active:scale-95"
          >
            <Plus size={16} />
            Add Status
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">

          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Search statuses..."
                className="w-full pl-9 pr-4 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {filteredStatuses?.length} total
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="col-span-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Name</div>
            <div className="col-span-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Flags</div>
            <div className="col-span-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">Actions</div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 cursor-pointer">
            {filteredStatuses?.length > 0 ? (
              filteredStatuses.map((status) => {
                const colors = getStatusColor(status.name);
                return (
                  <div
                    key={status.id}
                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-[#F7F8FF] transition-colors group"
                  >
                    {/* Name */}
                    <div className="col-span-5 flex items-center gap-3">
                      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${colors.dot}`} />
                      <span className="text-sm font-semibold text-gray-700">{status.name}</span>
                    </div>

                    {/* Flags */}
                    <div className="col-span-4 flex flex-wrap gap-1.5">
                      {status.is_system && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          System
                        </span>
                      )}
                      {status.is_final && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Final
                        </span>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => setModalState({ isOpen: true, mode: "edit", status })}
                        className="p-1.5 text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                        title="Edit"
                      >
                        <Pencil size={15} />
                      </button>
                      {!status.is_system && (
                        <button
                          onClick={() => {
                            setDeleteState({ isOpen: true, statusId: Number(status.id), statusName: status.name, isFinal: Boolean(status.is_final) });
                            setFallbackStatusId("");
                          }}
                          className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-16 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-50 mb-3">
                  <Hash className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-400 text-sm font-medium">No statuses found</p>
                <p className="text-gray-300 text-xs mt-1">Try a different search term</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <StatusModal
        isOpen={modalState.isOpen}
        handleClose={() => setModalState({ ...modalState, isOpen: false })}
        mode={modalState.mode}
        status={modalState.status ?? { name: "" }}
      />

      <DeleteConfirmModal
        isOpen={deleteState.isOpen}
        title="Delete Status"
        message={`Are you sure you want to delete this status? All associated tasks with "${deleteState.statusName}" will be deleted.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={() => {
          setDeleteState({ isOpen: false, statusId: null, statusName: null });
          setFallbackStatusId("");
        }}
        onConfirm={async () => {
          if (deleteState.statusId != null) {
            if (deleteState.isFinal && !fallbackStatusId) {
              alert("Please select a new final status.");
              return;
            }
            await dispatch(deleteStatus({ 
              id: deleteState.statusId, 
              new_final_id: fallbackStatusId ? Number(fallbackStatusId) : undefined 
            }));
            await dispatch(getAllStatuses());
          }
          setDeleteState({ isOpen: false, statusId: null, statusName: null });
          setFallbackStatusId("");
        }}
      >
        {deleteState.isFinal && (
          <div className="flex flex-col gap-2 mt-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select New Final Status *</label>
            <select
              value={fallbackStatusId}
              onChange={(e) => setFallbackStatusId(e.target.value)}
              className="w-full px-3 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
            >
              <option value="" disabled>Select a status...</option>
              {statuses.filter(s => s.id !== deleteState.statusId).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <p className="text-xs text-gray-400 leading-relaxed">
              Since you are deleting the final status, you must select another status to take its place.
            </p>
          </div>
        )}
      </DeleteConfirmModal>
    </div>
  );
};

export default StatusPage;