import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { getUserMock, recordVowRegistrationMock, logMlsAccessMock } = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  recordVowRegistrationMock: vi.fn(),
  logMlsAccessMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/vow", () => ({
  VOW_TERMS_VERSION: "2026-06-13",
  recordVowRegistration: recordVowRegistrationMock,
}));

vi.mock("@/lib/mls-access-log", () => ({
  logMlsAccess: logMlsAccessMock,
}));

import { POST } from "./route";

const originalVercel = process.env.VERCEL;

function request(body: unknown, headers: HeadersInit = {}): NextRequest {
  return new NextRequest("https://homewisefl.com/api/vow/register", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.VERCEL = "1";
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

afterEach(() => {
  if (originalVercel === undefined) delete process.env.VERCEL;
  else process.env.VERCEL = originalVercel;
});

describe("POST /api/vow/register", () => {
  it("stores only trusted and bounded client metadata", async () => {
    const response = await POST(
      request(
        { accept: true },
        {
          "x-forwarded-for": "10.0.0.1",
          "x-vercel-forwarded-for": "203.0.113.8, 76.76.21.21",
          "user-agent": "a".repeat(700),
        },
      ),
    );

    expect(response.status).toBe(200);
    expect(recordVowRegistrationMock).toHaveBeenCalledWith("user-1", {
      ipAddress: "203.0.113.8",
      userAgent: "a".repeat(512),
    });
    expect(logMlsAccessMock).toHaveBeenCalledWith(
      expect.objectContaining({ ipAddress: "203.0.113.8" }),
    );
  });

  it("rejects unknown fields and stale terms versions", async () => {
    const unknownFieldResponse = await POST(request({ accept: true, role: "admin" }));
    const staleTermsResponse = await POST(
      request({ accept: true, termsVersion: "2025-01-01" }),
    );

    expect(unknownFieldResponse.status).toBe(400);
    expect(staleTermsResponse.status).toBe(400);
    expect(recordVowRegistrationMock).not.toHaveBeenCalled();
  });

  it("rejects a request body over the fixed limit", async () => {
    const response = await POST(request({ accept: true, padding: "x".repeat(1_100) }));

    expect(response.status).toBe(413);
    expect(recordVowRegistrationMock).not.toHaveBeenCalled();
  });
});
