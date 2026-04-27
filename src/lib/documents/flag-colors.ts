import type { FlagColor } from "@/types/document-viewer";

export const FLAG_COLORS: readonly FlagColor[] = [
  "yellow",
  "blue",
  "green",
  "red",
  "purple",
  "orange",
] as const;

export const DEFAULT_FLAG_COLOR: FlagColor = "yellow";

const FLAG_COLOR_HEX: Record<FlagColor, string> = {
  yellow: "#f59e0b",
  blue: "#2563eb",
  green: "#16a34a",
  red: "#dc2626",
  purple: "#7c3aed",
  orange: "#ea580c",
};

const FLAG_COLOR_LABELS: Record<FlagColor, string> = {
  yellow: "Yellow",
  blue: "Blue",
  green: "Green",
  red: "Red",
  purple: "Purple",
  orange: "Orange",
};

export function flagColorHex(color: FlagColor): string {
  return FLAG_COLOR_HEX[color];
}

export function flagColorLabel(color: FlagColor): string {
  return FLAG_COLOR_LABELS[color];
}

export function isFlagColor(value: unknown): value is FlagColor {
  return (
    typeof value === "string" &&
    (FLAG_COLORS as readonly string[]).includes(value)
  );
}

export const FLAG_LABEL_PRESETS = ["Sign", "Initial", "Date", "Witness"] as const;
export type FlagLabelPreset = (typeof FLAG_LABEL_PRESETS)[number];

export const MAX_CUSTOM_LABEL_LENGTH = 12;

export const DEFAULT_FLAG_LABEL: FlagLabelPreset = "Sign";

export const FLAG_BASE_WIDTH = 96;
export const FLAG_BASE_HEIGHT = 24;
export const FLAG_NOTCH_WIDTH = 8;
export const FLAG_BODY_RADIUS = 3;

// Distance from the body center to the notch tip in PDF units, at scale 1.
// Used at placement time to put the notch tip under the user's click while
// storing the body center as the annotation anchor (so rotation pivots
// around the body center).
export const FLAG_TIP_OFFSET = FLAG_BASE_WIDTH / 2 + FLAG_NOTCH_WIDTH;

export const FLAG_MIN_SCALE = 0.5;
export const FLAG_MAX_SCALE = 2.5;
export const FLAG_DEFAULT_SCALE = 1;
export const FLAG_DEFAULT_ROTATION = 0;
export const FLAG_ROTATION_SNAP_DEGREES = 5;
export const FLAG_DRAG_THRESHOLD_PX = 3;

export function clampFlagScale(scale: number): number {
  if (!Number.isFinite(scale)) return FLAG_DEFAULT_SCALE;
  return Math.min(Math.max(scale, FLAG_MIN_SCALE), FLAG_MAX_SCALE);
}

export function normalizeFlagRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const mod = ((degrees % 360) + 360) % 360;
  return mod;
}
