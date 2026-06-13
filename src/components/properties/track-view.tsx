"use client";

import { useTrackView } from "@/hooks/use-track-view";

export function TrackView({ propertyId }: { propertyId: string }) {
  useTrackView(propertyId);
  return null;
}
