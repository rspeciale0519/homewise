import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { findManyMock, countMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { agent: { findMany: findManyMock, count: countMock } },
}));

import { GET } from "./route";

function req(qs = ""): NextRequest {
  return new NextRequest(`http://localhost/api/agents${qs}`);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/agents (public)", () => {
  it("selects an explicit allowlist that excludes invite/credential columns", async () => {
    findManyMock.mockResolvedValue([]);
    countMock.mockResolvedValue(0);

    await GET(req());

    const arg = findManyMock.mock.calls[0]?.[0];
    expect(arg?.select).toBeDefined();
    // sensitive fields must NOT be selected
    expect(arg.select.inviteCode).toBeUndefined();
    expect(arg.select.inviteExpiresAt).toBeUndefined();
    expect(arg.select.inviteUsed).toBeUndefined();
    expect(arg.select.userId).toBeUndefined();
    expect(arg.select.mlsAgentId).toBeUndefined();
    // public display fields ARE selected
    expect(arg.select.firstName).toBe(true);
    expect(arg.select.lastName).toBe(true);
    expect(arg.select.slug).toBe(true);
    expect(arg.select.photoUrl).toBe(true);
  });

  it("does not leak inviteCode in the response payload", async () => {
    findManyMock.mockResolvedValue([
      { id: "a1", firstName: "A", lastName: "B", slug: "a-b" },
    ]);
    countMock.mockResolvedValue(1);

    const res = await GET(req());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(JSON.stringify(body)).not.toContain("inviteCode");
  });
});
