import type { AnnotationFontFamily } from "@/types/document-viewer";

export const ANNOTATION_FONT_FAMILIES: AnnotationFontFamily[] = [
  "Helvetica",
  "Times",
  "Roboto",
  "Georgia",
  "Verdana",
];

export const DEFAULT_ANNOTATION_FONT_FAMILY: AnnotationFontFamily = "Helvetica";
export const DEFAULT_ANNOTATION_FONT_SIZE = 12;

export const FONT_SIZE_PRESETS = [8, 10, 12, 14, 16, 18, 24, 36] as const;
export const MIN_FONT_SIZE = 6;
export const MAX_FONT_SIZE = 96;

const FONT_FAMILY_CSS: Record<AnnotationFontFamily, string> = {
  Helvetica: "Helvetica, Arial, sans-serif",
  Times: "'Times New Roman', Times, serif",
  Roboto: "'Roboto Annotation', Helvetica, Arial, sans-serif",
  Georgia: "'Georgia Annotation', Georgia, serif",
  Verdana: "'Verdana Annotation', Verdana, sans-serif",
};

const FONT_FAMILY_LABELS: Record<AnnotationFontFamily, string> = {
  Helvetica: "Helvetica",
  Times: "Times",
  Roboto: "Roboto",
  Georgia: "Georgia",
  Verdana: "Verdana",
};

export function fontFamilyCss(
  family: AnnotationFontFamily | undefined
): string {
  return FONT_FAMILY_CSS[family ?? DEFAULT_ANNOTATION_FONT_FAMILY];
}

export function fontFamilyLabel(family: AnnotationFontFamily): string {
  return FONT_FAMILY_LABELS[family];
}

export function clampFontSize(size: number): number {
  if (!Number.isFinite(size)) return DEFAULT_ANNOTATION_FONT_SIZE;
  const rounded = Math.round(size);
  return Math.min(Math.max(rounded, MIN_FONT_SIZE), MAX_FONT_SIZE);
}
