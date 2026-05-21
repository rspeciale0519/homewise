import { describe, expect, it } from "vitest";
import { uncategorizedToDocumentItem } from "./shapers";
import type { AdminUncategorizedDoc } from "@/app/admin/documents/types";

const doc: AdminUncategorizedDoc = {
  id: "u1",
  slug: "loose-doc",
  name: "Loose Doc",
  description: "d",
  published: false,
  external: false,
  url: null,
  storageKey: "documents/k-u1",
  storageProvider: "supabase",
  mimeType: "application/pdf",
};

describe("uncategorizedToDocumentItem", () => {
  it("maps an uncategorized doc to an empty-category DocumentItem", () => {
    expect(uncategorizedToDocumentItem(doc)).toEqual({
      id: "u1",
      slug: "loose-doc",
      name: "Loose Doc",
      description: "d",
      url: null,
      external: false,
      storageKey: "documents/k-u1",
      storageProvider: "supabase",
      mimeType: "application/pdf",
      sizeBytes: null,
      sortOrder: 0,
      published: false,
      quickAccess: false,
      createdAt: "",
      updatedAt: "",
      categories: [],
    });
  });
});
