import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ShowingRequestForm } from "./showing-request-form";

const fetchMock = vi.hoisted(() => vi.fn());

function openAndFillForm() {
  fireEvent.click(screen.getByRole("button", { name: "Schedule a Showing" }));
  fireEvent.change(screen.getByPlaceholderText("First name"), {
    target: { value: "Taylor" },
  });
  fireEvent.change(screen.getByPlaceholderText("Last name"), {
    target: { value: "Morgan" },
  });
  fireEvent.change(screen.getByPlaceholderText("Email"), {
    target: { value: "taylor@example.com" },
  });
}

function submitForm(buttonName: string) {
  const button = screen.getByRole("button", { name: buttonName });
  const form = button.closest("form");
  if (!form) throw new Error("Showing request form was not found");
  fireEvent.submit(form);
}

describe("ShowingRequestForm", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("associates every form control with an explicit label", () => {
    render(<ShowingRequestForm propertyId="listing-1" propertyAddress="123 Main Street" />);
    fireEvent.click(screen.getByRole("button", { name: "Schedule a Showing" }));

    expect(screen.getByLabelText("First name")).toHaveAttribute("autocomplete", "given-name");
    expect(screen.getByLabelText("Last name")).toHaveAttribute("autocomplete", "family-name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Phone (optional)")).toHaveAttribute("autocomplete", "tel");
    expect(screen.getByLabelText("Preferred date (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Preferred time (optional)")).toBeInTheDocument();
    expect(screen.getByLabelText("Notes (optional)")).toBeInTheDocument();
  });

  it("shows an error and keeps the form available after an HTTP failure", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false } as Response);
    render(<ShowingRequestForm propertyId="listing-1" propertyAddress="123 Main Street" />);
    openAndFillForm();

    submitForm("Request Showing");

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not send your request. Please try again.",
    );
    expect(screen.queryByText("Request Sent!")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeEnabled();
  });

  it("recovers from a network failure when the user retries", async () => {
    fetchMock
      .mockRejectedValueOnce(new Error("Network unavailable"))
      .mockResolvedValueOnce({ ok: true } as Response);
    render(<ShowingRequestForm propertyId="listing-1" propertyAddress="123 Main Street" />);
    openAndFillForm();

    submitForm("Request Showing");
    await screen.findByRole("alert");
    submitForm("Try Again");

    expect(await screen.findByRole("status")).toHaveTextContent("Request Sent!");
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
