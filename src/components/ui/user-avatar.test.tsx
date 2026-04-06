import { createElement } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) =>
    createElement("img", {
      ...props,
      alt: typeof props.alt === "string" ? props.alt : "",
    }),
}));

describe("UserAvatar", () => {
  it("renders initials when no avatarUrl", () => {
    render(<UserAvatar firstName="John" lastName="Doe" size="md" avatarUrl={null} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders single initial for first name only", () => {
    render(<UserAvatar firstName="John" lastName="" size="md" avatarUrl={null} />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders image when avatarUrl is provided", () => {
    render(
      <UserAvatar
        firstName="John"
        lastName="Doe"
        size="md"
        avatarUrl="https://example.com/avatar.webp"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "John Doe");
  });

  it("applies sm size classes", () => {
    const { container } = render(
      <UserAvatar firstName="J" lastName="D" size="sm" avatarUrl={null} />
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("h-9");
    expect(el?.className).toContain("w-9");
  });

  it("applies lg size classes", () => {
    const { container } = render(
      <UserAvatar firstName="J" lastName="D" size="lg" avatarUrl={null} />
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("h-24");
    expect(el?.className).toContain("w-24");
  });
});
