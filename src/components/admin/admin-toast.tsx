"use client";

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
  return {
    toast: (message: string, type: ToastType = "info") => {
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
    },
  };
}
