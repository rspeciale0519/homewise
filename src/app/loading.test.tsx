import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Loading from "./loading";

describe("Loading", () => {
  it("renders a visible and announced spinner", () => {
    const { container } = render(<Loading />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    expect(container.querySelectorAll(".border-2")).toHaveLength(2);
    expect(container.querySelector(".border-3")).not.toBeInTheDocument();
  });
});
