import { describe, it, expect, vi, beforeEach } from "vitest";
import { adminFetch } from "@/lib/admin-fetch";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("adminFetch", () => {
  it("returns parsed JSON on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: "test" }),
    });

    const result = await adminFetch<{ data: string }>("/api/admin/test");
    expect(result.data).toBe("test");
  });

  it("passes Content-Type header by default", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await adminFetch("/api/admin/test");
    expect(mockFetch).toHaveBeenCalledWith("/api/admin/test", {
      headers: { "Content-Type": "application/json" },
    });
  });

  it("merges custom headers", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await adminFetch("/api/admin/test", {
      headers: { "X-Custom": "value" },
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((opts.headers as Record<string, string>)["X-Custom"]).toBe("value");
  });

  it("throws error with server error message", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: "Bad input" }),
    });

    await expect(adminFetch("/api/admin/test")).rejects.toThrow("Bad input");
  });

  it("throws generic error when response body is not JSON", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error("not json")),
    });

    await expect(adminFetch("/api/admin/test")).rejects.toThrow("Request failed (500)");
  });

  it("forwards request method and body", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    });

    await adminFetch("/api/admin/test", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });

    const [, opts] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(opts.method).toBe("POST");
    expect(opts.body).toBe(JSON.stringify({ name: "test" }));
  });
});
