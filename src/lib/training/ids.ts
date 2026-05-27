import { slugify } from "@/lib/slug/slugify";

/**
 * Deterministic id used by the Training Hub v1 migration when backfilling
 * `TrainingCategory` rows from the legacy `TrainingContent.category` string
 * column. New category creates in the admin UI also produce ids in this
 * shape so re-using a name yields a stable id (and so the v1 migration's
 * `categoryId` backfill matches future writes).
 *
 * Format: `"cat-" + slugify(name)`. Returns `null` when the name is empty
 * after slugification (caller decides whether to assign a fallback).
 */
export function trainingCategoryIdFromName(name: string): string | null {
  const slug = slugify(name);
  if (!slug) return null;
  return `cat-${slug}`;
}

/**
 * Deterministic id of the default "Lessons" section the v1 migration
 * created for every existing course. The runtime can resolve a course's
 * default section by this id without an extra DB lookup during the
 * transition window before Phase 2 wires Sections into the UI.
 */
export function defaultSectionIdForCourse(courseId: string): string {
  return `sec-${courseId}`;
}
