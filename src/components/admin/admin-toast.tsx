"use client";

import { useCallback, useMemo } from "react";
import { Toaster, toast as sonnerToast } from "sonner";

type ToastType = "success" | "error" | "info";

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

  return useMemo(() => ({ toast }), [toast]);
}
