import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SettingsTab } from "./settings-tab";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SettingsTab", () => {
  it("does not show controls without persistence or an alternate interval", () => {
    render(
      <SettingsTab
        status="active"
        currentPeriodEnd="2027-08-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
        billingInterval="annual"
        canChangeBillingInterval={false}
        items={[]}
      />,
    );

    expect(
      screen.getByText(
        "No alternate billing interval is available for your current products.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.queryByText("Email Notifications")).not.toBeInTheDocument();
    expect(screen.queryByText("Invoice receipts")).not.toBeInTheDocument();
  });

  it("uses a unique operation ID for an interval change", async () => {
    const fetchMock = vi.fn(
      (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Promise<Response>(() => undefined),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SettingsTab
        status="active"
        currentPeriodEnd="2027-08-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
        billingInterval="annual"
        canChangeBillingInterval
        items={[]}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Switch to Monthly Billing" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const options = fetchMock.mock.calls[0]?.[1];
    if (!options) throw new Error("Expected interval request options");
    expect(JSON.parse(options.body as string)).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      interval: "monthly",
    });
  });

  it("reuses the operation ID when an interval request is retried", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Temporary failure" }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <SettingsTab
        status="active"
        currentPeriodEnd="2027-08-01T00:00:00.000Z"
        cancelAtPeriodEnd={false}
        billingInterval="annual"
        canChangeBillingInterval
        items={[]}
      />,
    );

    const button = screen.getByRole("button", { name: "Switch to Monthly Billing" });
    fireEvent.click(button);
    await screen.findByText("Temporary failure");
    fireEvent.click(button);

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const firstBody = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as {
      operationId: string;
    };
    const secondBody = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string) as {
      operationId: string;
    };
    expect(secondBody.operationId).toBe(firstBody.operationId);
  });
});
