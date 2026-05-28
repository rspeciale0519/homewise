import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, createSignedUploadUrlMock } = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  createSignedUploadUrlMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({ createSignedUploadUrl: createSignedUploadUrlMock }),
    },
  }),
}));

import { POST } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };
const adminAuth = { user: { id: "admin-1" }, profile: { role: "admin" } };

function req(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/upload", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
});

describe("POST /api/admin/training/upload", () => {
  it("returns 403 for a non-admin caller and never mints an upload URL", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const res = await POST(
      req({ filename: "x.pdf", contentType: "application/pdf" }),
    );
    expect(res.status).toBe(403);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("returns a signed upload URL for an admin with an allowed type", async () => {
    createSignedUploadUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed" },
      error: null,
    });
    const res = await POST(
      req({ filename: "x.pdf", contentType: "application/pdf" }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.uploadUrl).toBe("https://signed");
    expect(createSignedUploadUrlMock).toHaveBeenCalled();
  });
});
