"use client";

import { useEffect, useRef } from "react";

export function useTrackDocumentView(
  documentPath: string,
  documentName: string,
  documentId: string | null = null,
) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    fetch("/api/documents/recents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentPath, documentId, documentName }),
    }).catch(() => {});
  }, [documentPath, documentId, documentName]);
}
