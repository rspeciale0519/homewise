import { z } from "zod";
import {
  DEFAULT_ANNOTATION_FONT_FAMILY,
  DEFAULT_ANNOTATION_FONT_SIZE,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
} from "@/lib/documents/fonts";
import { annotationFontFamilySchema } from "@/schemas/document-viewer.schema";
import type { AnnotationFontFamily } from "@/types/document-viewer";

const STORAGE_KEY = "homewise.documentViewer.textDefaults";

const textDefaultsSchema = z.object({
  fontFamily: annotationFontFamilySchema,
  fontSize: z.number().int().min(MIN_FONT_SIZE).max(MAX_FONT_SIZE),
});

export interface TextDefaults {
  fontFamily: AnnotationFontFamily;
  fontSize: number;
}

export const FALLBACK_TEXT_DEFAULTS: TextDefaults = {
  fontFamily: DEFAULT_ANNOTATION_FONT_FAMILY,
  fontSize: DEFAULT_ANNOTATION_FONT_SIZE,
};

export function readTextDefaults(): TextDefaults {
  if (typeof window === "undefined") return FALLBACK_TEXT_DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return FALLBACK_TEXT_DEFAULTS;
    const parsed = textDefaultsSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : FALLBACK_TEXT_DEFAULTS;
  } catch {
    return FALLBACK_TEXT_DEFAULTS;
  }
}

export function writeTextDefaults(defaults: TextDefaults): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Quota or privacy mode — silently ignore; in-memory state still works
  }
}
