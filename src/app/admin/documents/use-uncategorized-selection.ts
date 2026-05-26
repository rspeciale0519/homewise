"use client";

// Backwards-compatible re-export. The hook is now named
// `useDocumentSelection` since it works for any list of doc IDs, not just
// uncategorized docs. Existing call sites that imported under the old name
// continue to work.

export {
  useDocumentSelection as useUncategorizedSelection,
  type UseDocumentSelectionResult as UseUncategorizedSelectionResult,
} from "./use-document-selection";
