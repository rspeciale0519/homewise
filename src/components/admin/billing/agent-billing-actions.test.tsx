import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { RecordPaymentForm } from "./agent-billing-actions";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RecordPaymentForm", () => {
  it("keeps one operation ID for an unchanged offline payment retry", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <RecordPaymentForm
        agentId="agent-1"
        onSuccess={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50" } });
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Record Payment" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const firstOptions = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const secondOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const firstBody = JSON.parse(firstOptions.body as string) as Record<string, unknown>;
    const secondBody = JSON.parse(secondOptions.body as string) as Record<string, unknown>;

    expect(firstBody).toEqual({
      operationId: expect.stringMatching(/^[0-9a-f-]{36}$/),
      amount: 5_000,
      paymentType: "check",
    });
    expect(secondBody.operationId).toBe(firstBody.operationId);
  });
});
