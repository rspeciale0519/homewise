import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, documentCreateMock, generateUniqueSlugMock } =
  vi.hoisted(() => ({
    requireAdminApiMock: vi.fn(),
    documentCreateMock: vi.fn(),
    generateUniqueSlugMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { document: { create: documentCreateMock } },
}));
vi.mock("@/lib/slug/slugify", () => ({
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
  generateUniqueSlug: generateUniqueSlugMock,
}));
vi.mock("@/lib/slug/resolve", () => ({ isSlugTakenForDocument: vi.fn() }));

import { POST } from "@/app/api/admin/documents/bulk-create/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/documents/bulk-create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const item = (name: string) => ({
  name,
  storageKey: `documents/k-${name}`,
  storageProvider: "supabase" as const,
  mimeType: "application/pdf",
  sizeBytes: 100,
});

describe("POST /api/admin/documents/bulk-create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    generateUniqueSlugMock.mockImplementation(async (s: string) => s);
    documentCreateMock.mockImplementation(
      async ({ data }: { data: { name: string; slug: string } }) => ({
        id: `id-${data.name}`,
        name: data.name,
        slug: data.slug,
      }),
    );
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await POST(postReq({ items: [item("a")] }));
    expect(res.status).toBe(403);
    expect(documentCreateMock).not.toHaveBeenCalled();
  });

  it("400 on empty items", async () => {
    expect((await POST(postReq({ items: [] }))).status).toBe(400);
  });

  it("400 on more than 50 items", async () => {
    const res = await POST(
      postReq({ items: Array.from({ length: 51 }, (_, i) => item(`f${i}`)) }),
    );
    expect(res.status).toBe(400);
  });

  it("creates each as published:false with no categories", async () => {
    const res = await POST(postReq({ items: [item("a"), item("b")] }));
    expect(res.status).toBe(200);
    expect(documentCreateMock).toHaveBeenCalledTimes(2);
    const [firstCall] = documentCreateMock.mock.calls;
    const first = firstCall?.[0] as { data: Record<string, unknown> };
    expect(first.data.published).toBe(false);
    expect(first.data.categories).toBeUndefined();
    expect(first.data.storageProvider).toBe("supabase");
    expect(await res.json()).toEqual({
      created: [
        { id: "id-a", name: "a", slug: "a" },
        { id: "id-b", name: "b", slug: "b" },
      ],
      failed: [],
    });
  });

  it("records per-item failures without aborting the batch", async () => {
    documentCreateMock
      .mockImplementationOnce(async () => {
        throw new Error("dupe slug");
      })
      .mockImplementationOnce(
        async ({ data }: { data: { name: string; slug: string } }) => ({
          id: "id-b",
          name: data.name,
          slug: data.slug,
        }),
      );
    const res = await POST(postReq({ items: [item("a"), item("b")] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      created: [{ id: "id-b", name: "b", slug: "b" }],
      failed: [{ name: "a", error: "dupe slug" }],
    });
  });
});
