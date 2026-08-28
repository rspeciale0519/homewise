import { beforeEach, describe, expect, it, vi } from "vitest";

const updateMany = vi.hoisted(() => vi.fn());
vi.mock("@/lib/prisma", () => ({
  prisma: { mailOrder: { updateMany } },
}));
vi.mock("./storage", () => ({ getSignedUrl: vi.fn() }));
vi.mock("./bundle", () => ({ bundleKeyFor: vi.fn(), buildOrderBundle: vi.fn() }));
vi.mock("./email", () => ({
  sendDispatchFailureAlert: vi.fn(),
  sendOrderToYls: vi.fn(),
}));

import { dispatchMailOrderOnce } from "./dispatch";

describe("dispatchMailOrderOnce", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateMany.mockResolvedValue({ count: 0 });
  });

  it("uses an expiring dispatch claim", async () => {
    const outcome = await dispatchMailOrderOnce("order-1", "auto");

    expect(outcome.skipped).toBe("order dispatch is not pending");
    expect(updateMany).toHaveBeenCalledWith({
      where: {
        id: "order-1",
        status: "submitted",
        OR: [
          { emailStatus: { in: ["pending", "failed"] } },
          {
            emailStatus: "sending",
            OR: [
              { lastDispatchedAt: null },
              { lastDispatchedAt: { lt: expect.any(Date) } },
            ],
          },
        ],
      },
      data: {
        emailStatus: "sending",
        lastDispatchedAt: expect.any(Date),
      },
    });
  });
});
