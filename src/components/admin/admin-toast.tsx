"use client";

import { useCallback, useMemo } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info";

interface ToastWithUndoOptions {
  message: string;
  undoLabel?: string;
  durationMs?: number;
  onUndo: () => void;
}

export function AdminToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="bottom-right"
        richColors
        toastOptions={{
          duration: 4000,
          classNames: {
            toast: "rounded-xl text-sm font-medium shadow-lg",
          },
        }}
      />
    </>
  );
}

export function useToast() {
  const toast = useCallback((message: string, type: ToastType = "info") => {
    switch (type) {
      case "success":
        sonnerToast.success(message);
        break;
      case "error":
        sonnerToast.error(message);
        break;
      default:
        sonnerToast(message);
    }
  }, []);

  const toastWithUndo = useCallback(
    ({
      message,
      undoLabel = "Undo",
      durationMs = 5000,
      onUndo,
    }: ToastWithUndoOptions) => {
      sonnerToast.success(message, {
        duration: durationMs,
        action: {
          label: undoLabel,
          onClick: onUndo,
        },
      });
    },
    [],
  );

  return useMemo(() => ({ toast, toastWithUndo }), [toast, toastWithUndo]);
}
