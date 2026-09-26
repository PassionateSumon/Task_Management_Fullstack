import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { KeyRound, Pencil, Plus, Search, ShieldCheck, Trash2 } from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import { deleteRole, getAllRoles } from "../slices/RoleSlice";
import { getAllPermissions } from "../../permission/slices/PermissionSlice";
import RoleModal from "../components/RoleModal";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import type { Role } from "../types/Role.interface";
import { hasAnyPermission } from "../../../common/utils/permissions";

const RolePage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { roles } = useSelector((state: RootState) => state.role);
  const permissions = useSelector((state: RootState) => state.auth.permissions);

  const [searchTerm, setSearchTerm] = useState("");
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    mode: "add" | "edit";
    role: Role | null;
  }>({ isOpen: false, mode: "add", role: null });
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    roleId: number | null;
    roleName: string | null;
  }>({ isOpen: false, roleId: null, roleName: null });

  // Capability flags. UX only -- the API enforces every one of these.
  const canCreate = hasAnyPermission(permissions, "role.create");
  const canUpdate = hasAnyPermission(permissions, "role.update");
  const canDelete = hasAnyPermission(permissions, "role.delete");

  useEffect(() => {
    dispatch(getAllRoles());
    dispatch(getAllPermissions());
  }, [dispatch]);

  const filteredRoles = roles?.filter((role) =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const systemCount = roles?.filter((r) => r.is_system).length ?? 0;

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] p-6">
      <div className="max-w-3xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Roles
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Scoped to your workspace. System roles are read-only.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() =>
                setModalState({ isOpen: true, mode: "add", role: null })
              }
              className="inline-flex items-center gap-2 bg-[#5A67D8] hover:bg-[#434190] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <Plus size={16} />
              Add Role
            </button>
          )}
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Search bar */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-xs">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={14}
              />
              <input
                type="text"
                placeholder="Search roles..."
                className="w-full pl-9 pr-4 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {filteredRoles?.length} total
            </span>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="col-span-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Name
            </div>
            <div className="col-span-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Flags
            </div>
            <div className="col-span-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Permissions
            </div>
            <div className="col-span-2 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Actions
            </div>
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50">
            {filteredRoles?.length > 0 ? (
              filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-[#F7F8FF] transition-colors group"
                >
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#5A67D8]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-700 truncate">
                        {role.name}
                      </p>
                      {role.description && (
                        <p className="text-[11px] text-gray-400 truncate">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="col-span-3 flex flex-wrap gap-1.5">
                    {role.is_system && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                        System
                      </span>
                    )}
                    {role.user_type && (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200">
                        {role.user_type}
                      </span>
                    )}
                  </div>

                  <div className="col-span-3 flex items-center gap-1.5 text-xs text-gray-500">
                    <KeyRound size={13} className="text-gray-300 flex-shrink-0" />
                    <span className="font-semibold">
                      {role.permissions?.length ?? 0}
                    </span>
                  </div>

                  <div className="col-span-2 flex justify-end items-center gap-1.5">
                    {canUpdate && (
                      <button
                        onClick={() =>
                          setModalState({ isOpen: true, mode: "edit", role })
                        }
                        className="p-1.5 text-gray-400 hover:text-[#5A67D8] hover:bg-indigo-50 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                        title={role.is_system ? "View" : "Edit"}
                      >
                        <Pencil size={15} />
                      </button>
                    )}
                    {canDelete && !role.is_system && (
                      <button
                        onClick={() =>
                          setDeleteState({
                            isOpen: true,
                            roleId: role.id,
                            roleName: role.name,
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
              ))
            ) : (
              <div className="py-16 text-center">
                <div className="inline-flex p-4 rounded-full bg-gray-50 mb-3">
                  <ShieldCheck className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  No roles found
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>

        <p className="text-[11px] text-gray-400 text-center">
          {systemCount} system role{systemCount === 1 ? "" : "s"} in this
          workspace. Deleting a custom role moves its members to the default
          member role.
        </p>
      </div>

      <RoleModal
        isOpen={modalState.isOpen}
        handleClose={() => setModalState({ ...modalState, isOpen: false })}
        mode={modalState.mode}
        role={modalState.role}
      />

      <DeleteConfirmModal
        isOpen={deleteState.isOpen}
        title="Delete Role"
        message={`Delete "${deleteState.roleName}"? Everyone assigned to it will be moved to the default member role.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onClose={() => setDeleteState({ isOpen: false, roleId: null, roleName: null })}
        onConfirm={async () => {
          if (deleteState.roleId != null) {
            await dispatch(deleteRole(deleteState.roleId));
            await dispatch(getAllRoles());
          }
          setDeleteState({ isOpen: false, roleId: null, roleName: null });
        }}
      />
    </div>
  );
};

export default RolePage;
