import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  createSignedUploadUrlMock,
  infoMock,
  downloadMock,
  moveMock,
  removeMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  createSignedUploadUrlMock: vi.fn(),
  infoMock: vi.fn(),
  downloadMock: vi.fn(),
  moveMock: vi.fn(),
  removeMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: () => ({
        createSignedUploadUrl: createSignedUploadUrlMock,
        info: infoMock,
        download: downloadMock,
        move: moveMock,
        remove: removeMock,
      }),
    },
  }),
}));

vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));

import { POST, PUT } from "./route";

const forbidden = { error: new Response("forbidden", { status: 403 }) };
const adminAuth = { user: { id: "admin-1" }, profile: { role: "admin" } };
const PDF = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n9\n%%EOF\n";

function request(method: "POST" | "PUT", body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/training/upload", {
    method,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue(adminAuth);
  moveMock.mockResolvedValue({ data: {}, error: null });
  removeMock.mockResolvedValue({ data: {}, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/admin/training/upload", () => {
  it("returns 403 for a non-admin caller and never mints an upload URL", async () => {
    requireAdminApiMock.mockResolvedValue(forbidden);
    const response = await POST(request("POST", {
      filename: "x.pdf",
      contentType: "application/pdf",
      byteSize: 100,
    }));
    expect(response.status).toBe(403);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("returns a create-only signed URL for an allowed file", async () => {
    createSignedUploadUrlMock.mockResolvedValue({
      data: { signedUrl: "https://signed" },
      error: null,
    });
    const response = await POST(request("POST", {
      filename: "x.pdf",
      contentType: "application/pdf",
      byteSize: 100,
    }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.uploadUrl).toBe("https://signed");
    expect(body.pendingKey).toMatch(/^pending\/[0-9a-f-]+-100-x\.pdf$/);
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith(
      body.pendingKey,
      { upsert: false },
    );
  });

  it("rejects a permitted MIME with the wrong extension", async () => {
    const response = await POST(request("POST", {
      filename: "x.pdf",
      contentType: "image/jpeg",
      byteSize: 100,
    }));

    expect(response.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("applies the smaller image limit", async () => {
    const response = await POST(request("POST", {
      filename: "x.jpg",
      contentType: "image/jpeg",
      byteSize: (5 * 1024 * 1024) + 1,
    }));

    expect(response.status).toBe(413);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("does not expose storage provider error details", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    createSignedUploadUrlMock.mockResolvedValue({
      data: null,
      error: {
        name: "StorageApiError",
        message: "Storage failed with service-role-token-sensitive",
        statusCode: 500,
      },
    });

    const response = await POST(request("POST", {
      filename: "x.pdf",
      contentType: "application/pdf",
      byteSize: 100,
    }));

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: "Failed to create upload URL" });
  });

  it("rejects unknown request fields", async () => {
    const response = await POST(request("POST", {
      filename: "x.pdf",
      contentType: "application/pdf",
      byteSize: 100,
      storageKey: "chosen/by/client.pdf",
    }));

    expect(response.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/training/upload", () => {
  it("returns a trusted training key only after server inspection", async () => {
    const byteSize = new TextEncoder().encode(PDF).byteLength;
    const pendingKey =
      `pending/123e4567-e89b-42d3-a456-426614174000-${byteSize}-lesson.pdf`;
    infoMock.mockResolvedValue({
      data: { size: byteSize, contentType: "application/pdf" },
      error: null,
    });
    downloadMock.mockResolvedValue({
      data: new Blob([PDF], { type: "application/pdf" }),
      error: null,
    });

    const response = await PUT(request("PUT", {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      fileKey:
        `training/123e4567-e89b-42d3-a456-426614174000-${byteSize}-lesson.pdf`,
      mimeType: "application/pdf",
      sizeBytes: byteSize,
    });
    expect(moveMock).toHaveBeenCalledWith(
      pendingKey,
      pendingKey.replace("pending/", "training/"),
    );
  });
});
