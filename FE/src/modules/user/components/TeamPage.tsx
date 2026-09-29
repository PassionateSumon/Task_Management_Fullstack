import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Ban,
  CheckCircle2,
  Search,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import {
  assignUserRole,
  deleteUser,
  getWorkspaceUsers,
  toggleUserActive,
} from "../slices/userSlice";
import { getAllRoles } from "../../role/slices/RoleSlice";
import CreateUserModal from "./CreateUserModal";
import DeleteConfirmModal from "../../../common/components/DeleteConfirmModal";
import { hasAnyPermission } from "../../../common/utils/permissions";

const DEFAULT_ROLE_NAME = "user";

/**
 * Workspace member administration.
 *
 * Replaces the previous "Invite User or Admin" screen, which called the public
 * `/auth/signup` endpoint and therefore created a brand-new workspace per
 * invitee rather than adding anyone to the caller's own workspace.
 */
const TeamPage = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { workspaceUsers } = useSelector((state: RootState) => state.user);
  const { roles } = useSelector((state: RootState) => state.role);
  const permissions = useSelector((state: RootState) => state.auth.permissions);
  const currentUserId = useSelector((state: RootState) => state.auth.userId);

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [deleteState, setDeleteState] = useState<{
    isOpen: boolean;
    id: number | null;
    name: string | null;
  }>({ isOpen: false, id: null, name: null });

  const canCreate = hasAnyPermission(permissions, "user.create");
  const canUpdate = hasAnyPermission(permissions, "user.update");
  const canDelete = hasAnyPermission(permissions, "user.delete");

  useEffect(() => {
    dispatch(getWorkspaceUsers());
    dispatch(getAllRoles());
  }, [dispatch]);

  const filteredUsers = (workspaceUsers ?? []).filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      (user.name ?? "").toLowerCase().includes(term) ||
      (user.email ?? "").toLowerCase().includes(term)
    );
  });

  // const nameFor = (roleId?: string) =>
  //   roles?.find((r) => String(r.id) === String(roleId))?.name ??
  //   DEFAULT_ROLE_NAME;

  return (
    <div className="h-[94vh] overflow-y-auto thin-scrollbar bg-[#F3F4FE] p-6">
      <div className="max-w-4xl mx-auto flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Team
            </h1>
            <p className="text-gray-400 text-xs mt-0.5">
              Everyone in your workspace. Roles decide what each person can do.
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 bg-[#5A67D8] hover:bg-[#434190] text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shadow-sm cursor-pointer active:scale-95"
            >
              <UserPlus size={16} />
              Add User
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
                placeholder="Search team..."
                className="w-full pl-9 pr-4 py-2 bg-[#F3F4FE] border border-transparent rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
              {filteredUsers.length} member
              {filteredUsers.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="grid grid-cols-12 px-5 py-2.5 bg-gray-50 border-b border-gray-100">
            <div className="col-span-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Member
            </div>
            <div className="col-span-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Role
            </div>
            <div className="col-span-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Status
            </div>
            <div className="col-span-2 text-right text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Actions
            </div>
          </div>

          <div className="divide-y divide-gray-50">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => {
                const isSelf = user.id === currentUserId;
                return (
                  <div
                    key={user.id}
                    className="grid grid-cols-12 items-center px-5 py-3.5 hover:bg-[#F7F8FF] transition-colors group"
                  >
                    <div className="col-span-4 flex items-center gap-3 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-[#5A67D8]">
                          {(user.name ?? "?")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {user.name}
                          {isSelf && (
                            <span className="ml-1.5 text-[10px] font-bold uppercase text-gray-400">
                              you
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>

                    <div className="col-span-3 min-w-0">
                      {canUpdate ? (
                        <select
                          value={(user as any).role_id ?? ""}
                          onChange={(e) =>
                            dispatch(
                              assignUserRole({
                                id: user.id,
                                role_id: Number(e.target.value),
                              })
                            )
                          }
                          className="w-full max-w-[10rem] px-2 py-1.5 bg-[#F3F4FE] border border-transparent rounded-lg text-xs font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] cursor-pointer"
                        >
                          {roles?.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-[#5A67D8]">
                          {user?.user_type?.toUpperCase() ?? DEFAULT_ROLE_NAME.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="col-span-3">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
                          Inactive
                        </span>
                      )}
                    </div>

                    <div className="col-span-2 flex justify-end items-center gap-1.5">
                      {canUpdate && (
                        <button
                          onClick={() =>
                            dispatch(toggleUserActive(user.id))
                          }
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition-all opacity-0 group-hover:opacity-100"
                          title={user.isActive ? "Deactivate" : "Activate"}
                        >
                          {user.isActive ? (
                            <Ban size={15} />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                        </button>
                      )}
                      {canDelete && !isSelf && (
                        <button
                          onClick={() =>
                            setDeleteState({
                              isOpen: true,
                              id: user.id,
                              name: user.name,
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
                  <Users className="text-gray-300" size={28} />
                </div>
                <p className="text-gray-400 text-sm font-medium">
                  No members found
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  Try a different search term
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateUserModal
        isOpen={isCreateOpen}
        handleClose={() => setIsCreateOpen(false)}
      />

      <DeleteConfirmModal
        isOpen={deleteState.isOpen}
        title="Remove Member"
        message={`Remove "${deleteState.name}" from this workspace? This cannot be undone.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onClose={() => setDeleteState({ isOpen: false, id: null, name: null })}
        onConfirm={async () => {
          if (deleteState.id != null) {
            await dispatch(deleteUser(deleteState.id));
            await dispatch(getWorkspaceUsers());
          }
          setDeleteState({ isOpen: false, id: null, name: null });
        }}
      />
    </div>
  );
};

export default TeamPage;
