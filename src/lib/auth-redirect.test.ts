import { describe, expect, it } from "vitest";
import { safeAuthRedirectPath } from "./auth-redirect";

describe("safeAuthRedirectPath", () => {
  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "javascript:alert(1)",
    "/\\evil.example/path",
    "/%5cevil.example/path",
    "/%2f%2fevil.example/path",
    "/%252f%252fevil.example/path",
    "/.//evil.example/path",
    "/a/..//evil.example/path",
    "/%2e%2e//evil.example/path",
    "/dashboard\u0000/admin",
    "/%0aevil",
  ])("rejects an unsafe redirect target: %s", (value) => {
    expect(safeAuthRedirectPath(value)).toBe("/dashboard");
  });

  it.each([
    ["/admin", "/admin"],
    ["/dashboard/orders?id=123#details", "/dashboard/orders?id=123#details"],
    ["/properties/123%20Main", "/properties/123%20Main"],
  ])("allows a same-origin path: %s", (value, expected) => {
    expect(safeAuthRedirectPath(value)).toBe(expected);
  });

  it("uses the requested fallback for missing input", () => {
    expect(safeAuthRedirectPath(null, "/login")).toBe("/login");
  });
});
