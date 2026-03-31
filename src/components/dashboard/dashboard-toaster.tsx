"use client";

import { Toaster } from "sonner";

export function DashboardToaster() {
  return (
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
  );
}
