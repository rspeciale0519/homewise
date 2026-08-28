import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

const usePathnameMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: usePathnameMock,
}));

import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Sidebar } from "@/components/dashboard/sidebar";

describe("shared sidebar navigation", () => {
  it("marks active admin links in desktop and mobile navigation", () => {
    usePathnameMock.mockReturnValue("/admin/contacts/contact-1");
    render(<AdminSidebar />);

    for (const link of screen.getAllByRole("link", { name: "Contacts" })) {
      expect(link).toHaveAttribute("aria-current", "location");
    }
  });

  it("marks active dashboard links in desktop and mobile navigation", () => {
    usePathnameMock.mockReturnValue("/dashboard/favorites");
    render(<Sidebar role="user" />);

    for (const link of screen.getAllByRole("link", { name: "Favorites" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
  });

  it("does not match a partial dashboard route segment", () => {
    usePathnameMock.mockReturnValue("/dashboard/agent-hub");
    render(<Sidebar role="agent" />);

    for (const link of screen.getAllByRole("link", { name: "Resources" })) {
      expect(link).toHaveAttribute("aria-current", "page");
    }
    for (const link of screen.getAllByRole("link", { name: "My Agent" })) {
      expect(link).not.toHaveAttribute("aria-current");
    }
  });
});
