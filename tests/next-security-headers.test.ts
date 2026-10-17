import { describe, expect, it } from "vitest";
import nextConfig from "../next.config";

describe("site security headers", () => {
  it("sends a restrictive CSP that blocks plugins and framing", async () => {
    const headers = await nextConfig.headers?.();
    const globalHeaders = headers?.find((entry) => entry.source === "/(.*)")?.headers ?? [];
    const csp = globalHeaders.find((header) => header.key === "Content-Security-Policy")?.value;

    expect(csp).toContain("base-uri 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});
