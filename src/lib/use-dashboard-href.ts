"use client";

import { useEffect, useState } from "react";
import { DEFAULT_DASHBOARD_PATH } from "@/lib/dashboard-view";

export function useDashboardHref(signedIn: boolean): string {
  const [fetchedHref, setFetchedHref] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn) return;

    let cancelled = false;
    fetch("/api/me/dashboard-view", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { path?: string } | null) => {
        if (cancelled) return;
        if (data?.path && typeof data.path === "string" && data.path.startsWith("/")) {
          setFetchedHref(data.path);
        }
      })
      .catch(() => {
        // Keep the default.
      });

    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  if (!signedIn) return DEFAULT_DASHBOARD_PATH;
  return fetchedHref ?? DEFAULT_DASHBOARD_PATH;
}
