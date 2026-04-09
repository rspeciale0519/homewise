"use client";

import { useEffect, useRef } from "react";

export function useTrackDocumentView(documentPath: string, documentName: string) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    fetch("/api/documents/recents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentPath, documentName }),
    }).catch(() => {});
  }, [documentPath, documentName]);
}
