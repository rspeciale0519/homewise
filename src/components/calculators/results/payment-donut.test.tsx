import { render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PaymentDonut } from "./payment-donut";

describe("PaymentDonut", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders without a non-positive Recharts size warning", async () => {
    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    render(
      <PaymentDonut
        segments={[
          { name: "Principal", value: 1_500, color: "#ffffff" },
          { name: "Taxes", value: 300, color: "#000000" },
        ]}
        centerLabel="Your Payment"
        centerValue="$1,800.00"
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("svg.recharts-surface")).toBeInTheDocument();
    });

    const warnings = warningSpy.mock.calls.flat().join(" ");
    expect(warnings).not.toContain("should be greater than 0");
  });
});
