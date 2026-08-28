import { afterEach, describe, expect, it, vi } from "vitest";
import { logApiError } from "./api-error";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logApiError", () => {
  it("logs safe provider identifiers without logging the exception message", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const error = Object.assign(
      new Error("Database password=secret and token sk_live_sensitive"),
      {
        code: "card_declined",
        statusCode: 402,
        requestId: "req_123",
      },
    );

    logApiError("billing/test", error);

    expect(consoleError).toHaveBeenCalledWith(
      "[billing/test] request failed",
      {
        name: "Error",
        code: "card_declined",
        statusCode: 402,
        requestId: "req_123",
      },
    );
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("secret");
    expect(JSON.stringify(consoleError.mock.calls)).not.toContain("sk_live_sensitive");
  });
});
