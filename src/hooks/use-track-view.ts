"use client";

import { useEffect } from "react";
import { useSupabase } from "@/components/providers/supabase-provider";

export function useTrackView(propertyId: string) {
  const { user } = useSupabase();

  useEffect(() => {
    if (!user || !propertyId) return;

    fetch("/api/user/recently-viewed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId }),
    }).catch(() => {
      // silently ignore tracking failures
    });
  }, [user, propertyId]);
}
