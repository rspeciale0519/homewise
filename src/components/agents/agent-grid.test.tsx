import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Agent } from "@/types/agent";
import { AgentGrid } from "./agent-grid";

vi.mock("next/image", () => ({
  default: ({
    fill: _fill,
    ...props
  }: {
    fill?: boolean;
    [key: string]: unknown;
  }) => createElement("img", props),
}));

function agent(index: number): Agent {
  return {
    id: `agent-${index}`,
    firstName: `Agent${index}`,
    lastName: "Example",
    slug: `agent-${index}`,
    email: null,
    phone: null,
    photoUrl: `/agent-${index}.jpg`,
    languages: ["English"],
    designations: [],
    bio: null,
    active: true,
  };
}

describe("AgentGrid", () => {
  it("loads the largest possible first row eagerly", () => {
    render(<AgentGrid agents={Array.from({ length: 6 }, (_, index) => agent(index))} />);

    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(6);
    images.slice(0, 5).forEach((image) => {
      expect(image).toHaveAttribute("loading", "eager");
    });
    expect(images[5]).toHaveAttribute("loading", "lazy");
  });
});
