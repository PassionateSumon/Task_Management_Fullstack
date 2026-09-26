import { useEffect, useRef, useState, type FormEvent } from "react";
import { useDispatch } from "react-redux";
import { AlertTriangle, KeyRound, X } from "lucide-react";
import type { AppDispatch } from "../../../store/store";
import { createPermission, updatePermission } from "../slices/PermissionSlice";
import type { Permission } from "../types/Permission.interface";

const PermissionModal = ({
  isOpen,
  handleClose,
  mode,
  permission,
}: {
  isOpen: boolean;
  handleClose: () => void;
  mode: "add" | "edit";
  permission: Permission | null;
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const isSystemEdit = mode === "edit" && Boolean(permission?.is_system);

  useEffect(() => {
    if (mode === "edit" && permission) {
      setName(permission.name ?? "");
      setDescription(permission.description ?? "");
    } else {
      setName("");
      setDescription("");
    }
  }, [mode, permission]);

  const reset = () => {
    setName("");
    setDescription("");
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSystemEdit) return;
    if (mode === "add") {
      await dispatch(createPermission({ name, description }));
    } else if (permission) {
      await dispatch(
        updatePermission({ id: permission.id, name, description })
      );
    }
    reset();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <KeyRound className="w-4 h-4 text-[#5A67D8]" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              {mode === "add" ? "Add Permission" : "Edit Permission"}
            </h2>
          </div>
          <button
            onClick={() => {
              reset();
              handleClose();
            }}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Permission Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. reports.export"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isSystemEdit}
            />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Lowercase dotted notation, e.g. <code>module.action</code>
            </p>
            {isSystemEdit && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                <p className="text-xs font-medium">
                  System permissions cannot be modified. The API rejects any
                  change.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this permission allow?"
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSystemEdit}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={isSystemEdit}
              className="flex-1 bg-[#5A67D8] hover:bg-[#434190] disabled:opacity-50 disabled:cursor-not-allowed text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95"
            >
              {mode === "add" ? "Add Permission" : "Save Changes"}
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

export default PermissionModal;
