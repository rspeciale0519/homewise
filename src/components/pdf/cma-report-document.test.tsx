import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@react-pdf/renderer", () => ({
  Document: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Page: ({ children }: { children?: ReactNode }) => <>{children}</>,
  View: ({ children }: { children?: ReactNode }) => <>{children}</>,
  Text: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
  StyleSheet: { create: (styles: unknown) => styles },
  Font: { register: vi.fn() },
}));

import { CmaReportDocument } from "./cma-report-document";

describe("CmaReportDocument", () => {
  it("includes active comparable listings", () => {
    render(
      <CmaReportDocument
        comps={[]}
        activeComps={[
          {
            address: "130 Oak Ave",
            price: 490_000,
            beds: 3,
            baths: 2,
            sqft: 1_850,
            dom: 12,
          },
        ]}
        subjectProperty={{
          address: "123 Oak Ave",
          city: "Orlando",
          zip: "32801",
        }}
      />,
    );

    expect(screen.getByText("Active Listings")).toBeInTheDocument();
    expect(screen.getByText("130 Oak Ave")).toBeInTheDocument();
    expect(screen.getByText("$490,000")).toBeInTheDocument();
  });
});
