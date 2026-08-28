import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { updateMany, findUnique } = vi.hoisted(() => ({
  updateMany: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: vi.fn().mockResolvedValue({ user: { id: "admin-1" } }),
  isError: vi.fn(() => false),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { propertyAlert: { updateMany, findUnique } },
}));

import { PATCH } from "./route";

function request(active: boolean) {
  return new NextRequest("http://localhost/api/admin/alerts/alert-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ active }),
  });
}

describe("PATCH /api/admin/alerts/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("does not activate an alert that still needs email confirmation", async () => {
    updateMany.mockResolvedValue({ count: 0 });
    findUnique.mockResolvedValue({ verificationRequired: true });

    const response = await PATCH(request(true), {
      params: Promise.resolve({ id: "alert-1" }),
    });

    expect(response.status).toBe(409);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "alert-1", verificationRequired: false },
      data: { active: true },
    });
  });

  it("deactivates a verified alert", async () => {
    updateMany.mockResolvedValue({ count: 1 });
    findUnique.mockResolvedValue({ id: "alert-1", active: false });

    const response = await PATCH(request(false), {
      params: Promise.resolve({ id: "alert-1" }),
    });

    expect(response.status).toBe(200);
    expect(updateMany).toHaveBeenCalledWith({
      where: { id: "alert-1" },
      data: { active: false },
    });
  });
});
