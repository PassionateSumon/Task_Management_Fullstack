import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KeyRound, Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  deletePermission,
  getAllPermissions,
} from "../slices/PermissionSlice";
import PermissionModal from "../components/PermissionModal";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import type { Permission } from "../types/Permission.interface";
import { hasAnyPermission, permissionModule } from "../../../common/utils/permissions";

const PermissionPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { permissions } = useSelector((state: RootState) => state.permission);
  const authPermissions = useSelector(
    (state: RootState) => state.auth.permissions
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    permission: Permission | null;
  }>({ isOpen: false, mode: "add", permission: null });
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    permissionId: number | null;
    permissionName: string | null;
  }>({ isOpen: false, permissionId: null, permissionName: null });

  const canCreate = hasAnyPermission(authPermissions, "permission.create");
  const canUpdate = hasAnyPermission(authPermissions, "permission.update");
  const canDelete = hasAnyPermission(authPermissions, "permission.delete");

  useEffect(() => {
    dispatch(getAllPermissions());
  }, [dispatch]);

  const filtered = useMemo(
    () =>
      (permissions ?? []).filter((permission) =>
        permission.name.toLowerCase().includes(searchTerm.toLowerCase())
      ),
    [permissions, searchTerm]
  );

  const systemCount =
    permissions?.filter((p) => p.is_system || p.workspace_id == null).length ?? 0;

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Permissions
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              The capability catalogue. System permissions are read-only.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() =>
                setModalState({ isOpen: true, mode: "add", permission: null })
              }
              className="inline-flex items-center gap-2 bg-[#5A67D8] hover:bg-[#434190] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              Add Permission
            </button>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search permissions..."
                className="w-full pl-9 pr-4 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {filtered.length} total
            </span>
          </div>

          <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="col-span-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Name
            </div>
            <div className="col-span-5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Description
            </div>
            <div className="col-span-3 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Actions
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filtered.length > 0 ? (
              filtered.map((permission) => {
                const isSystem = Boolean(
                  permission.is_system || permission.workspace_id == null
                );
                return (
                  <div
                    key={permission.id}
                    className="grid grid-cols-12 items-center px-5 py-3 hover:bg-[#F7F8FF] transition-colors group"
                  >
                    <div className="col-span-4 flex items-center gap-2.5 min-w-0">
                      <KeyRound
                        size={13}
                        className="text-gray-300 flex-shrink-0"
                      />
                      <span className="text-xs font-mono font-semibold text-gray-700 truncate">
                        {permission.name}
                      </span>
                      <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 flex-shrink-0">
                        {permissionModule(permission.name)}
                      </span>
                    </div>

                    <div className="col-span-5 min-w-0">
                      <p className="text-xs text-gray-500 truncate">
                        {permission.description || "—"}
                      </p>
                    </div>

                    <div className="col-span-3 flex justify-end items-center gap-1.5">
                      {isSystem && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200 mr-1">
                          System
                        </span>
                      )}
                      {canUpdate && (
                        <button
                          onClick={() =>
                            setModalState({
                              isOpen: true,
                              mode: "edit",
                              permission,
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                          title={isSystem ? "View" : "Edit"}
                        >
                          <Pencil size={15} />
                        </button>
                      )}
                      {canDelete && !isSystem && (
                        <button
                          onClick={() =>
                            setDeleteState({
                              isOpen: true,
                              permissionId: permission.id,
                              permissionName: permission.name,
                            })
                          }
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
                  <KeyRound className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  No permissions found
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          {systemCount} system permission{systemCount === 1 ? "" : "s"} shared
          across all workspaces. Custom permissions belong to this workspace only.
        </p>
      </div>

      <PermissionModal
        isOpen={modalState.isOpen}
        handleClose={() => setModalState({ ...modalState, isOpen: false })}
        mode={modalState.mode}
        permission={modalState.permission}
      />

      <DeleteConfirmModal
        isOpen={deleteState.isOpen}
        title="Delete Permission"
        message={`Delete "${deleteState.permissionName}"? It will be removed from every role in this workspace.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={() =>
          setDeleteState({
            isOpen: false,
            permissionId: null,
            permissionName: null,
          })
        }
        onConfirm={async () => {
          if (deleteState.permissionId != null) {
            await dispatch(deletePermission(deleteState.permissionId));
            await dispatch(getAllPermissions());
          }
          setDeleteState({
            isOpen: false,
            permissionId: null,
            permissionName: null,
          });
        }}
      />
    </div>
  );
};

export default PermissionPage;
