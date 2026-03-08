"use client";

import * as AlertDialog from "@radix-ui/react-alert-dialog";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={(v) => !v && onCancel()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-sm w-full p-6 shadow-elevated z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
          <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-slate-600 mt-2">
            {message}
          </AlertDialog.Description>
          <div className="flex gap-2 pt-4">
            <AlertDialog.Action asChild>
              <button
                onClick={onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors"
              >
                {confirmLabel}
              </button>
            </AlertDialog.Action>
            <AlertDialog.Cancel asChild>
              <button className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
            </AlertDialog.Cancel>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
