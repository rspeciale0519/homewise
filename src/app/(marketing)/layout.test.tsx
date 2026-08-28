import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/layout/header", () => ({ Header: () => <header>Header</header> }));
vi.mock("@/components/layout/footer", () => ({ Footer: () => <footer>Footer</footer> }));

import MarketingLayout from "./layout";

describe("MarketingLayout", () => {
  it("provides a skip link and focusable main target", () => {
    render(<MarketingLayout><p>Page content</p></MarketingLayout>);

    expect(screen.getByRole("link", { name: "Skip to main content" })).toHaveAttribute(
      "href",
      "#main-content",
    );
    expect(screen.getByRole("main")).toHaveAttribute("id", "main-content");
    expect(screen.getByRole("main")).toHaveAttribute("tabindex", "-1");
  });
});
