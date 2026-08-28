import { beforeEach, describe, expect, it, vi } from "vitest";
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

const PDF = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\nstartxref\n9\n%%EOF\n";

function request(method: "POST" | "PUT", body: unknown): NextRequest {
  return new NextRequest("https://homewise.test/api/admin/documents/upload", {
    method,
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue({
    user: { id: "admin-1" },
    profile: { role: "admin" },
  });
  createSignedUploadUrlMock.mockResolvedValue({
    data: { signedUrl: "https://signed.example/upload" },
    error: null,
  });
  infoMock.mockResolvedValue({ data: null, error: { message: "missing" } });
  downloadMock.mockResolvedValue({ data: null, error: { message: "missing" } });
  moveMock.mockResolvedValue({ data: {}, error: null });
  removeMock.mockResolvedValue({ data: {}, error: null });
});

describe("POST /api/admin/documents/upload", () => {
  it("creates a create-only URL for a pending object with an encoded size", async () => {
    const response = await POST(request("POST", {
      filename: "policy.pdf",
      contentType: "application/pdf",
      byteSize: 100,
    }));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pendingKey).toMatch(
      /^pending\/[0-9a-f-]+-100-policy\.pdf$/,
    );
    expect(createSignedUploadUrlMock).toHaveBeenCalledWith(
      body.pendingKey,
      { upsert: false },
    );
  });

  it("rejects a filename and MIME mismatch", async () => {
    const response = await POST(request("POST", {
      filename: "policy.pdf",
      contentType: "image/jpeg",
      byteSize: 100,
    }));

    expect(response.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects a file above the server limit", async () => {
    const response = await POST(request("POST", {
      filename: "policy.pdf",
      contentType: "application/pdf",
      byteSize: (25 * 1024 * 1024) + 1,
    }));

    expect(response.status).toBe(413);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized signing request", async () => {
    const response = await POST(request("POST", {
      filename: `${"x".repeat(2_100)}.pdf`,
      contentType: "application/pdf",
      byteSize: 100,
    }));

    expect(response.status).toBe(413);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });

  it("rejects unknown request fields", async () => {
    const response = await POST(request("POST", {
      filename: "policy.pdf",
      contentType: "application/pdf",
      byteSize: 100,
      storageKey: "chosen/by/client.pdf",
    }));

    expect(response.status).toBe(400);
    expect(createSignedUploadUrlMock).not.toHaveBeenCalled();
  });
});

describe("PUT /api/admin/documents/upload", () => {
  it("validates and moves an uploaded object before returning its final key", async () => {
    const byteSize = new TextEncoder().encode(PDF).byteLength;
    const pendingKey =
      `pending/123e4567-e89b-42d3-a456-426614174000-${byteSize}-policy.pdf`;
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
      storageKey:
        `documents/123e4567-e89b-42d3-a456-426614174000-${byteSize}-policy.pdf`,
      storageProvider: "supabase",
      mimeType: "application/pdf",
      sizeBytes: byteSize,
    });
    expect(moveMock).toHaveBeenCalledWith(
      pendingKey,
      pendingKey.replace("pending/", "documents/"),
    );
  });

  it("removes content that fails server inspection", async () => {
    const content = "%PDF-1.7\ntruncated";
    const byteSize = new TextEncoder().encode(content).byteLength;
    const pendingKey =
      `pending/123e4567-e89b-42d3-a456-426614174000-${byteSize}-policy.pdf`;
    infoMock.mockResolvedValue({
      data: { size: byteSize, contentType: "application/pdf" },
      error: null,
    });
    downloadMock.mockResolvedValue({
      data: new Blob([content], { type: "application/pdf" }),
      error: null,
    });

    const response = await PUT(request("PUT", {
      pendingKey,
      contentType: "application/pdf",
      byteSize,
    }));

    expect(response.status).toBe(415);
    expect(removeMock).toHaveBeenCalledWith([pendingKey]);
    expect(moveMock).not.toHaveBeenCalled();
  });
});
