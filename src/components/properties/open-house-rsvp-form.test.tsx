import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { OpenHouseRsvpForm } from "./open-house-rsvp-form";

const slots = [
  { date: "2026-09-05", startTime: "10:00", endTime: "12:00" },
  { date: "2026-09-06", startTime: "13:00", endTime: "15:00" },
];

describe("OpenHouseRsvpForm", () => {
  it("associates every form control with an explicit label", () => {
    render(<OpenHouseRsvpForm listingId="listing-1" slots={slots} />);
    fireEvent.click(screen.getByRole("button", { name: /RSVP/ }));

    expect(screen.getByLabelText("Open house date")).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "email");
    expect(screen.getByLabelText("Phone (optional)")).toHaveAttribute("autocomplete", "tel");
  });
});
