import { X, Trash2 } from "lucide-react";
import React from "react";

type Props = {
  isOpen: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
};

const DeleteConfirmModal: React.FC<Props> = ({
  isOpen,
  title = "Confirm Delete",
  message = "Are you sure you want to delete this item? This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  children,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-700">
            <X size={18} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 rounded-full bg-rose-100 inline-flex items-center justify-center">
                <Trash2 className="text-rose-600" />
              </div>
            </div>
            <div>
              <p className="text-sm text-slate-700">{message}</p>
              {children && <div className="mt-4">{children}</div>}
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-100 text-sm font-medium text-slate-700 hover:bg-slate-200"
            >
              {cancelLabel}
            </button>
            <button
              onClick={() => {
                onConfirm();
              }}
              className="px-4 py-2 rounded-lg bg-rose-600 text-white text-sm font-bold hover:bg-rose-700"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmModal;
