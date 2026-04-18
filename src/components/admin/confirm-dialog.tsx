"use client";

import { useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  typeToConfirm?: string;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  typeToConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset typed value on each dialog open
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (open && typeToConfirm && inputRef.current) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, typeToConfirm]);

  const matches = typeToConfirm ? typed === typeToConfirm : true;
  const canConfirm = matches && !busy;

  const handleConfirm = () => {
    if (!canConfirm) return;
    void onConfirm();
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canConfirm) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-sm w-full p-6 shadow-elevated z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
          <div className="flex items-start gap-3">
            {typeToConfirm && (
              <div className="h-9 w-9 rounded-full bg-crimson-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-crimson-600" />
              </div>
            )}
            <div className="flex-1">
              <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-slate-600 mt-2">
                {message}
              </AlertDialog.Description>
            </div>
          </div>

          {typeToConfirm && (
            <div className="border-t border-slate-100 pt-4 mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                Type{" "}
                <span className="font-mono text-crimson-600 normal-case tracking-normal">
                  {typeToConfirm}
                </span>{" "}
                to confirm
              </p>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={typeToConfirm}
                disabled={busy}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`mt-2 font-mono text-sm h-10 px-3 w-full border rounded-lg placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-crimson-600 transition-all ${
                  matches
                    ? "border-crimson-300 bg-crimson-50/30"
                    : "border-slate-200"
                }`}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {busy && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busy ? `${confirmLabel}…` : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
