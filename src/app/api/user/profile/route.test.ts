import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, updateMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  updateMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: {
      findUnique: vi.fn(),
      update: updateMock,
    },
  },
}));

import { PATCH } from "./route";

function request(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/user/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/user/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUserMock.mockResolvedValue({ data: { user: { id: "user-a" } } });
    updateMock.mockResolvedValue({ id: "user-a", role: "user" });
  });

  it("ignores a client-supplied role and only updates the caller's allowlisted fields", async () => {
    const res = await PATCH(request({
      firstName: "Ada",
      lastName: "Agent",
      phone: "555-0100",
      role: "admin",
      isAdmin: true,
    }));

    expect(res.status).toBe(200);
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: {
        firstName: "Ada",
        lastName: "Agent",
        phone: "555-0100",
      },
    });
  });
});
