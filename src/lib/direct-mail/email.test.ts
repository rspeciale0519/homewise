import { beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn());
vi.mock("@/lib/email", () => ({ sendEmail }));

import { sendOrderToYls } from "./email";

describe("sendOrderToYls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sendEmail.mockResolvedValue({ id: "email-1", error: null });
  });

  it("uses a stable provider idempotency key for an order", async () => {
    await sendOrderToYls({
      orderRef: "order-1",
      submittedAt: new Date("2026-08-24T12:00:00Z"),
      agent: {
        name: "Ava Agent",
        email: "ava@example.com",
        phone: null,
        brokerage: "Homewise",
      },
      workflow: "farm",
      subjectPropertyAddress: null,
      campaignName: "Summer",
      productType: "postcard",
      productSize: "6x9",
      mailClass: "marketing_mail",
      dropDate: "2026-09-01",
      quantity: 100,
      returnAddress: {
        name: "Ava Agent",
        address1: "1 Main St",
        address2: "",
        city: "Orlando",
        state: "FL",
        zip: "32801",
      },
      specialInstructions: null,
      signedUrls: { summary: "https://example.test/summary", bundle: null },
      artworkLinks: [],
      listLinks: [],
    });

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      idempotencyKey: "direct-mail-order:order-1",
    }));
  });
});
