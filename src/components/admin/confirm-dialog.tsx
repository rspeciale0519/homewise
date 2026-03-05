"use client";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl max-w-sm w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-navy-700 text-lg">{title}</h3>
        <p className="text-sm text-slate-600">{message}</p>
        <div className="flex gap-2 pt-2">
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
