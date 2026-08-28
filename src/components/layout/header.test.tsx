import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

const usePathnameMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

vi.mock("next/image", () => ({
  default: ({ priority: _priority, ...props }: { priority?: boolean; [key: string]: unknown }) =>
    createElement("img", props),
}));

vi.mock("./mobile-nav", () => ({ MobileNav: () => null }));
vi.mock("./auth-buttons", () => ({ AuthButtons: () => null }));
vi.mock("./user-menu", () => ({ UserMenu: () => null }));

import { Header } from "./header";

describe("Header", () => {
  beforeEach(() => {
    usePathnameMock.mockReturnValue("/sellers/staging");
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
      callback(0);
      return 1;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a desktop submenu by button and closes it with Escape", () => {
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Open For Sellers submenu" });

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const currentChild = screen.getByRole("link", { name: /Home Staging Tips/ });
    expect(currentChild).toHaveAttribute("aria-current", "page");

    fireEvent.keyDown(currentChild, { key: "Escape" });

    expect(screen.queryByRole("link", { name: /Home Staging Tips/ })).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });

  it("keeps a hover-opened submenu open after a pointer click", () => {
    render(<Header />);
    const trigger = screen.getByRole("button", { name: "Open For Sellers submenu" });

    fireEvent.mouseEnter(trigger);
    fireEvent.click(trigger, { detail: 1 });

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /Home Staging Tips/ })).toBeInTheDocument();
  });

  it("marks a direct navigation link as the current page", () => {
    usePathnameMock.mockReturnValue("/properties");
    render(<Header />);

    expect(screen.getByRole("link", { name: "Find a Property" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });
});
