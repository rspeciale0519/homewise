import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, findFirstMock, updateMock, deleteMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  findFirstMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    savedSearch: {
      findFirst: findFirstMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}));

import { DELETE, PATCH } from "./route";

const context = { params: Promise.resolve({ id: "search-b" }) };

function patchReq(): NextRequest {
  return new NextRequest("http://localhost/api/user/saved-searches/search-b", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Stolen" }),
  });
}

describe("saved-search IDOR", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-a" } } });
    findFirstMock.mockResolvedValue(null);
  });

  it("does not let user A rename user B's saved search", async () => {
    const res = await PATCH(patchReq(), context);
    expect(res.status).toBe(404);
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "search-b", userId: "user-a" },
    });
    expect(updateMock).not.toHaveBeenCalled();
  });

  it("does not let user A delete user B's saved search", async () => {
    const res = await DELETE(
      new NextRequest("http://localhost/api/user/saved-searches/search-b", {
        method: "DELETE",
      }),
      context,
    );
    expect(res.status).toBe(404);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});
