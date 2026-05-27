"use client";

// Thin alias of useDocumentSelection — the underlying hook is generic
// (operates on any readonly string[] of IDs), so re-using it for Training
// content rows means we share all the modifier-key, shift-range, and
// toggle-subset semantics with the Document Library.
export {
  useDocumentSelection as useTrainingSelection,
  type UseDocumentSelectionResult as UseTrainingSelectionResult,
} from "@/app/admin/documents/use-document-selection";
