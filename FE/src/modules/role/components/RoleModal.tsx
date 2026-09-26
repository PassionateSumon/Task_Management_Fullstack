import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import type { AppDispatch, RootState } from "../../../store/store";
import { createRole, updateRole } from "../slices/RoleSlice";
import type { Role } from "../types/Role.interface";
import PermissionPicker from "./PermissionPicker";

const RoleModal = ({
  isOpen,
  handleClose,
  mode,
  role,
}: {
  isOpen: boolean;
  handleClose: () => void;
  mode: "add" | "edit";
  role: Role | null;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const { permissions } = useSelector((state: RootState) => state.permission);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  /** System roles are immutable at the domain layer; mirror that in the UI. */
  const isSystemEdit = mode === "edit" && Boolean(role?.is_system);

  useEffect(() => {
    if (mode === "edit" && role) {
      setName(role.name ?? "");
      setDescription(role.description ?? "");
      setSelected((role.permissions ?? []).map((p) => p.id));
    } else {
      setName("");
      setDescription("");
      setSelected([]);
    }
  }, [mode, role]);

  // Grouping, filtering and the scroll region all live in PermissionPicker.

  const reset = () => {
    setName("");
    setDescription("");
    setSelected([]);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        reset();
        handleClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [handleClose]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        reset();
        handleClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const toggle = (id: number) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSystemEdit) return;
    if (mode === "add") {
      await dispatch(
        createRole({ name, description, permission_ids: selected })
      );
    } else if (role) {
      await dispatch(
        updateRole({ id: role.id, name, description, permission_ids: selected })
      );
    }
    reset();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4">
      <div
        ref={ref}
        className="bg-white shadow-xl w-full sm:rounded-2xl sm:max-w-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh] overflow-hidden rounded-t-2xl"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4 text-[#5A67D8]" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              {mode === "add" ? "Create Role" : "Edit Role"}
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              reset();
              handleClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body. `flex-1 min-h-0` lets the permission list below claim the
            leftover height; the form itself must not scroll, otherwise the list
            would end up scrolling inside a scrolling page. */}
        <form
          onSubmit={handleSubmit}
          className="px-5 sm:px-6 py-5 flex flex-col gap-4 flex-1 min-h-0"
        >
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <label
              htmlFor="role-name"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              Role Name
            </label>
            <input
              id="role-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Manager, Reviewer..."
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              minLength={2}
              disabled={isSystemEdit}
            />
            {isSystemEdit && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                <p className="text-xs font-medium">
                  System roles are read-only. The API rejects any change to them.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <label
              htmlFor="role-description"
              className="text-xs font-semibold text-gray-500 uppercase tracking-wider"
            >
              Description
            </label>
            <input
              id="role-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this role allowed to do?"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSystemEdit}
            />
          </div>

          <PermissionPicker
            permissions={permissions}
            selected={selected}
            onToggle={toggle}
            disabled={isSystemEdit}
          />

          {/* Actions */}
          <div className="flex gap-2 pt-1 flex-shrink-0">
            <button
              type="submit"
              disabled={isSystemEdit}
              className="flex-1 bg-[#5A67D8] hover:bg-[#434190] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95"
            >
              {mode === "add" ? "Create Role" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={() => {
                reset();
                handleClose();
              }}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;
