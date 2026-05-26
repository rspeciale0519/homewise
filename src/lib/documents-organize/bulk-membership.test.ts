import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import {
  bulkAssignMemberships,
  bulkMoveMemberships,
  bulkUnassignMemberships,
} from "./bulk-membership";

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("bulkAssignMemberships", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  afterEach(() => {
    fetchMock.mockReset();
  });

  it("POSTs to /api/admin/documents/memberships/bulk-assign with payload", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        categoryId: "cat1",
        assigned: [{ documentId: "d1", sortOrder: 5 }],
        skipped: [],
        failed: [],
      }),
    );

    const result = await bulkAssignMemberships({
      categoryId: "cat1",
      documentIds: ["d1"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/documents/memberships/bulk-assign");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      categoryId: "cat1",
      documentIds: ["d1"],
    });
    expect(result.assigned).toEqual([{ documentId: "d1", sortOrder: 5 }]);
  });

  it("propagates HTTP errors via AdminFetchError", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ error: "Category not found" }, { status: 404 }),
    );

    await expect(
      bulkAssignMemberships({ categoryId: "missing", documentIds: ["d1"] }),
    ).rejects.toThrow("Category not found");
  });
});

describe("bulkUnassignMemberships", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("POSTs to bulk-unassign and returns removed list", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        categoryId: "cat1",
        removed: ["d1", "d2"],
        failed: [],
      }),
    );

    const result = await bulkUnassignMemberships({
      categoryId: "cat1",
      documentIds: ["d1", "d2"],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/documents/memberships/bulk-unassign");
    expect(init.method).toBe("POST");
    expect(result.removed).toEqual(["d1", "d2"]);
  });
});

describe("bulkMoveMemberships", () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it("POSTs to bulk-move with moves[] payload and target categoryId", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        toCategoryId: "targetCat",
        moved: [
          { documentId: "d1", sortOrder: 5 },
          { documentId: "d2", sortOrder: 6 },
        ],
        skipped: [],
        failed: [],
      }),
    );

    const result = await bulkMoveMemberships({
      toCategoryId: "targetCat",
      moves: [
        { documentId: "d1", fromCategoryId: "srcA" },
        { documentId: "d2", fromCategoryId: "srcB" },
      ],
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/admin/documents/memberships/bulk-move");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body as string)).toEqual({
      toCategoryId: "targetCat",
      moves: [
        { documentId: "d1", fromCategoryId: "srcA" },
        { documentId: "d2", fromCategoryId: "srcB" },
      ],
    });
    expect(result.moved).toHaveLength(2);
  });

  it("supports toCategoryId: null for drag-to-Uncategorized", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        toCategoryId: null,
        moved: [{ documentId: "d1", sortOrder: null }],
        skipped: [],
        failed: [],
      }),
    );

    const result = await bulkMoveMemberships({
      toCategoryId: null,
      moves: [{ documentId: "d1", fromCategoryId: "srcCat" }],
    });

    expect(result.toCategoryId).toBeNull();
    expect(result.moved[0]?.sortOrder).toBeNull();
  });
});
