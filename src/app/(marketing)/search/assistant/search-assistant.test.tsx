import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SearchAssistant } from "./search-assistant";

const fetchMock = vi.hoisted(() => vi.fn());
const originalScrollIntoView = Element.prototype.scrollIntoView;
let nextId = 0;

describe("SearchAssistant", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    nextId = 0;
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("crypto", {
      randomUUID: () => `test-id-${++nextId}`,
    });
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Element.prototype.scrollIntoView = originalScrollIntoView;
  });

  it("exposes the conversation and search field to assistive technology", () => {
    render(<SearchAssistant />);

    const log = screen.getByRole("log", { name: "Property search conversation" });
    expect(log).toHaveAttribute("aria-live", "polite");
    expect(log).toHaveAttribute("aria-relevant", "additions text");
    expect(
      screen.getByRole("textbox", { name: "Describe the property you are looking for" }),
    ).toBeInTheDocument();
  });

  it("shows a readable error message for a failed HTTP response", async () => {
    const json = vi.fn();
    fetchMock.mockResolvedValueOnce({ ok: false, json } as unknown as Response);
    render(<SearchAssistant />);

    fireEvent.change(
      screen.getByRole("textbox", { name: "Describe the property you are looking for" }),
      { target: { value: "Three bedrooms near downtown" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(await screen.findByText("Sorry, something went wrong.")).toBeInTheDocument();
    expect(json).not.toHaveBeenCalled();
    fireEvent.change(
      screen.getByRole("textbox", { name: "Describe the property you are looking for" }),
      { target: { value: "Try another search" } },
    );
    expect(screen.getByRole("button", { name: "Search" })).toBeEnabled();
  });

  it("rejects a successful response with an invalid body", async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: vi.fn().mockResolvedValue({ conversationId: "conversation-1" }),
    } as unknown as Response);
    render(<SearchAssistant />);

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show me 3-bedroom homes in Oviedo under $400k",
      }),
    );

    expect(await screen.findByText("Sorry, something went wrong.")).toBeInTheDocument();
  });
});
