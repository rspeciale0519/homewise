import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  userProfileFindUniqueMock,
  mailOrderFindUniqueMock,
  mailOrderUpdateManyMock,
  inngestSendMock,
  dispatchMailOrderOnceMock,
  logApiErrorMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  mailOrderFindUniqueMock: vi.fn(),
  mailOrderUpdateManyMock: vi.fn(),
  inngestSendMock: vi.fn(),
  dispatchMailOrderOnceMock: vi.fn(),
  logApiErrorMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: getUserMock } }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: userProfileFindUniqueMock },
    mailOrder: {
      findUnique: mailOrderFindUniqueMock,
      updateMany: mailOrderUpdateManyMock,
    },
  },
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: inngestSendMock },
}));

vi.mock("@/lib/direct-mail/dispatch", () => ({
  SHOULD_DISPATCH_INLINE: false,
  dispatchMailOrderOnce: dispatchMailOrderOnceMock,
}));

vi.mock("@/lib/api-error", () => ({
  logApiError: logApiErrorMock,
}));

import { POST } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  userProfileFindUniqueMock.mockResolvedValue({ id: "user-1", role: "agent" });
  mailOrderFindUniqueMock.mockResolvedValue({
    id: "order-1",
    userId: "user-1",
    status: "submitted",
    emailStatus: "sent",
    lastDispatchedAt: null,
    summaryPdfKey: "order-1/summary.pdf",
    artworkFiles: [{ fileKey: "order-1/artwork.pdf" }],
    listFiles: [{ fileKey: "order-1/list.csv" }],
  });
  mailOrderUpdateManyMock.mockResolvedValue({ count: 1 });
  inngestSendMock.mockResolvedValue(undefined);
  dispatchMailOrderOnceMock.mockResolvedValue({
    success: true,
    messageId: "message-1",
    error: null,
  });
});

describe("POST /api/direct-mail/orders/[id]/resend", () => {
  it("dispatches inline when event enqueue fails", async () => {
    inngestSendMock.mockRejectedValue(new Error("enqueue unavailable"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(dispatchMailOrderOnceMock).toHaveBeenCalledWith(
      "order-1",
      "resend_button",
    );
    expect(logApiErrorMock).toHaveBeenCalledWith(
      "direct-mail/resend-enqueue",
      expect.any(Error),
    );
  });

  it("releases an unchanged claim when dispatch cannot start", async () => {
    inngestSendMock.mockRejectedValue(new Error("enqueue unavailable"));
    dispatchMailOrderOnceMock.mockRejectedValue(new Error("dispatch unavailable"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(502);
    expect(mailOrderUpdateManyMock).toHaveBeenCalledWith({
      where: expect.objectContaining({
        id: "order-1",
        emailStatus: "pending",
        lastDispatchedAt: expect.any(Date),
      }),
      data: { emailStatus: "sent", lastDispatchedAt: null },
    });
  });
});
