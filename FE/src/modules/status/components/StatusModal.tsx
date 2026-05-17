import { useEffect, useRef, useState, type FormEvent } from "react";
import type { AppDispatch } from "../../../store/store";
import { useDispatch } from "react-redux";
import { createStatus, getAllStatuses, updateStatus } from "../slices/StatusSlice";
import { X, Tag, AlertTriangle } from "lucide-react";

const StatusModal = ({
  isOpen,
  handleClose,
  mode,
  status,
}: {
  isOpen: boolean;
  handleClose: () => void;
  mode: "add" | "edit";
  status: { id?: string | number; name?: string; is_final?: boolean; is_system?: boolean };
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const [name, setName] = useState("");
  const [isFinal, setIsFinal] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (mode === "edit" && status) {
      setName(status.name || "");
      setIsFinal(Boolean(status.is_final));
    } else {
      setName("");
      setIsFinal(false);
    }
  }, [mode, status]);

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

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { reset(); handleClose(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [handleClose]);

  const reset = () => { setName(""); setIsFinal(false); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (mode === "add") {
      await dispatch(createStatus({ name, is_final: isFinal }));
    } else {
      await dispatch(updateStatus({ id: Number(status.id), name, is_final: isFinal }));
    }
    reset();
    handleClose();
    await dispatch(getAllStatuses());
  };

  const handleCloseModal = () => { reset(); handleClose(); };

  if (!isOpen) return null;

  const isSystemEdit = mode === "edit" && Boolean(status?.is_system);

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div
        ref={ref}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
      >
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#5A67D8]" />
            </div>
            <h2 className="text-sm font-bold text-gray-800">
              {mode === "add" ? "Add Status" : "Edit Status"}
            </h2>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">

          {/* Name field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Status Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. In Review, Blocked..."
              className="w-full px-3 py-2.5 bg-[#F3F4FE] border border-transparent rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#5A67D8]/20 focus:border-[#5A67D8] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              required
              disabled={isSystemEdit}
            />
            {isSystemEdit && (
              <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                <p className="text-xs font-medium">System status names cannot be changed.</p>
              </div>
            )}
          </div>

          {/* Final checkbox */}
          <div
            onClick={() => setIsFinal(!isFinal)}
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              isFinal
                ? "bg-indigo-50 border-[#5A67D8]/30"
                : "bg-gray-50 border-gray-200 hover:bg-gray-100"
            }`}
          >
            <div className={`w-5 h-5 mt-0.5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
              isFinal ? "bg-[#5A67D8] border-[#5A67D8]" : "bg-white border-gray-300"
            }`}>
              {isFinal && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
            <div>
              <p className={`text-sm font-semibold ${isFinal ? "text-[#5A67D8]" : "text-gray-700"}`}>
                Mark as Final
              </p>
              <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                Only one final status per workspace. Moving tasks here sets their completion date.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex-1 bg-[#5A67D8] hover:bg-[#434190] text-white py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer active:scale-95"
            >
              {mode === "add" ? "Add Status" : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={handleCloseModal}
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

export default StatusModal;