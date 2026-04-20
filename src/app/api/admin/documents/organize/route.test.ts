import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireAdminApiMock, categoryFindManyMock } = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategory: { findMany: categoryFindManyMock },
  },
}));

import { GET } from "@/app/api/admin/documents/organize/route";

describe("GET /api/admin/documents/organize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
  });

  it("returns 403 for non-admin users", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      }),
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns the tree grouped by section with drafts and empty categories included", async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: "catOffice1",
        slug: "office-general",
        title: "Office General",
        description: null,
        section: "office",
        sortOrder: 0,
        documents: [
          {
            sortOrder: 0,
            categoryId: "catOffice1",
            document: {
              id: "doc1",
              slug: "doc1",
              name: "Doc 1",
              description: null,
              published: true,
              quickAccess: false,
              external: false,
              url: null,
              storageKey: "doc1.pdf",
              storageProvider: "supabase",
              mimeType: "application/pdf",
            },
          },
        ],
      },
      {
        id: "catOfficeEmpty",
        slug: "office-empty",
        title: "Office Empty",
        description: null,
        section: "office",
        sortOrder: 1,
        documents: [],
      },
      {
        id: "catListing1",
        slug: "listing-forms",
        title: "Listing Forms",
        description: null,
        section: "listing",
        sortOrder: 0,
        documents: [
          {
            sortOrder: 0,
            categoryId: "catListing1",
            document: {
              id: "doc2",
              slug: "doc2",
              name: "Doc 2 Draft",
              description: null,
              published: false,
              quickAccess: false,
              external: false,
              url: null,
              storageKey: "doc2.pdf",
              storageProvider: "supabase",
              mimeType: "application/pdf",
            },
          },
        ],
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sections.office.categories).toHaveLength(2);
    expect(body.sections.office.categories[1].documents).toEqual([]);
    expect(body.sections.listing.categories[0].documents[0].published).toBe(
      false,
    );
    expect(body.sections.sales.categories).toEqual([]);
  });
});
