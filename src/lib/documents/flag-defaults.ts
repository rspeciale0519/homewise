import { flagColorSchema } from "@/schemas/document-viewer.schema";
import type { FlagColor } from "@/types/document-viewer";
import { DEFAULT_FLAG_COLOR } from "@/lib/documents/flag-colors";

const STORAGE_KEY = "homewise.documentViewer.flagDefaultColor";

export function readFlagDefaultColor(): FlagColor {
  if (typeof window === "undefined") return DEFAULT_FLAG_COLOR;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FLAG_COLOR;
    const parsed = flagColorSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_FLAG_COLOR;
  } catch {
    return DEFAULT_FLAG_COLOR;
  }
}

export function writeFlagDefaultColor(color: FlagColor): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, color);
  } catch {
    // Quota or privacy mode — silently ignore; in-memory state still works
  }
}
