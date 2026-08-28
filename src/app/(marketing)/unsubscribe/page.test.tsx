import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

vi.mock("next/navigation", () => ({ redirect: redirectMock }));

import UnsubscribePage from "./page";

describe("UnsubscribePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["malformed", "not-a-real-token"],
    ["empty", ""],
    ["duplicate", ["first-token", "second-token"]],
    ["oversized", "x".repeat(2_049)],
  ])("redirects the %s token case to the clean URL", async (_case, token) => {
    await expect(UnsubscribePage({
      searchParams: Promise.resolve({ token }),
    })).rejects.toThrow("NEXT_REDIRECT");

    expect(redirectMock).toHaveBeenCalledWith("/unsubscribe");
  });

  it("shows the invalid-link state when the token is missing", async () => {
    render(await UnsubscribePage({ searchParams: Promise.resolve({}) }));

    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Link Not Available" })).toBeInTheDocument();
  });
});
