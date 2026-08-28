import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EmailActionConfirmation } from "./email-action-confirmation";

describe("EmailActionConfirmation", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("removes the token from the address and submits it only after a click", async () => {
    const replaceState = vi.spyOn(window.history, "replaceState");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <EmailActionConfirmation
        token="signed-token"
        endpoint="/api/test-action"
        title="Confirm Action"
        description="Confirm this action."
        buttonLabel="Confirm"
        successTitle="Complete"
        successMessage="The action is complete."
      />,
    );

    expect(replaceState).toHaveBeenCalledWith(null, "", window.location.pathname);
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/test-action", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "signed-token" }),
    }));
    expect(await screen.findByRole("heading", { name: "Complete" })).toBeInTheDocument();
  });
});
