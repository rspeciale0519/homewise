import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const routerMocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
}));
const signOutMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
  useRouter: () => routerMocks,
}));

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: { priority?: boolean; [key: string]: unknown }) =>
    createElement("img", props),
}));

vi.mock("@/components/providers/supabase-provider", () => ({
  useSupabase: () => ({
    user: null,
    supabase: { auth: { signOut: signOutMock } },
    loading: false,
  }),
}));

import { MobileNav } from "./mobile-nav";

describe("MobileNav", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("provides an accessible description without a Radix warning", () => {
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    render(<MobileNav open onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog", { name: "Navigation menu" });
    expect(dialog).toHaveAccessibleDescription("Browse site pages and account options.");
    expect(warningSpy).not.toHaveBeenCalledWith(
      expect.stringContaining("Missing `Description`"),
    );
  });
});
