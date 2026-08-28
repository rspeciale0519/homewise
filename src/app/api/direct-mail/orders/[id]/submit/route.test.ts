import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getUserMock,
  userProfileFindUniqueMock,
  mailOrderFindUniqueMock,
  mailOrderUpdateManyMock,
  downloadObjectWithinLimitMock,
  uploadCreateOnlyAtKeyMock,
  deleteObjectsMock,
  renderToBufferMock,
  inspectArtworkMock,
  parseListPreviewMock,
  sanitizeCsvForSpreadsheetMock,
  logApiErrorMock,
  buildOrderBundleMock,
  dispatchMailOrderOnceMock,
  inngestSendMock,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  mailOrderFindUniqueMock: vi.fn(),
  mailOrderUpdateManyMock: vi.fn(),
  downloadObjectWithinLimitMock: vi.fn(),
  uploadCreateOnlyAtKeyMock: vi.fn(),
  deleteObjectsMock: vi.fn(),
  renderToBufferMock: vi.fn(),
  inspectArtworkMock: vi.fn(),
  parseListPreviewMock: vi.fn(),
  sanitizeCsvForSpreadsheetMock: vi.fn(),
  logApiErrorMock: vi.fn(),
  buildOrderBundleMock: vi.fn(),
  dispatchMailOrderOnceMock: vi.fn(),
  inngestSendMock: vi.fn(),
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

vi.mock("@/lib/direct-mail/storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/direct-mail/storage")>();
  return {
    ...actual,
    downloadObjectWithinLimit: downloadObjectWithinLimitMock,
    uploadCreateOnlyAtKey: uploadCreateOnlyAtKeyMock,
    deleteObjects: deleteObjectsMock,
  };
});

vi.mock("@/lib/direct-mail/artwork-validator", () => ({
  inspectArtwork: inspectArtworkMock,
}));

vi.mock("@/lib/direct-mail/csv-validator", () => ({
  filterCsvColumns: (value: string) => value,
  parseListPreview: parseListPreviewMock,
  sanitizeCsvForSpreadsheet: sanitizeCsvForSpreadsheetMock,
}));

vi.mock("@react-pdf/renderer", () => ({
  renderToBuffer: renderToBufferMock,
}));

vi.mock("@/lib/direct-mail/order-summary-pdf", () => ({
  OrderSummaryPdf: () => null,
}));

vi.mock("@/lib/direct-mail/bundle", () => ({
  buildOrderBundle: buildOrderBundleMock,
}));

vi.mock("@/lib/direct-mail/dispatch", () => ({
  SHOULD_DISPATCH_INLINE: false,
  dispatchMailOrderOnce: dispatchMailOrderOnceMock,
}));

vi.mock("@/inngest/client", () => ({
  inngest: { send: inngestSendMock },
}));

vi.mock("@/lib/api-error", () => ({
  logApiError: logApiErrorMock,
}));

import { POST } from "./route";

const artwork = (id: string) => ({
  id,
  name: `Artwork ${id}`,
  fileKey: `order-1/artwork-${id}.pdf`,
  fileName: `${id}.pdf`,
  byteSize: 9,
  mimeType: "application/pdf",
  warnings: [],
});

const listFile = {
  id: "list-1",
  name: "Mailing List",
  fileKey: "order-1/list-list-1.csv",
  fileName: "mailing-list.csv",
  byteSize: 24,
  rowCount: 1,
  columns: ["email"],
  fillPercent: { email: 100 },
  excludedColumns: [],
  warnings: [],
};

function order(artworkFiles = [artwork("art-1")]) {
  return {
    id: "order-1",
    userId: "user-1",
    status: "draft",
    updatedAt: new Date(),
    workflow: "just_listed",
    subjectPropertyAddress: "123 Oak Ave",
    campaignName: "September campaign",
    productType: "postcard",
    productSize: "4x6",
    mailClass: "first_class",
    dropDate: new Date("2030-01-02T00:00:00.000Z"),
    returnAddress: {
      name: "Avery Agent",
      address1: "100 Main St",
      address2: null,
      city: "Orlando",
      state: "FL",
      zip: "32801",
    },
    quantity: 1,
    specialInstructions: null,
    artworkFiles,
    listFiles: [listFile],
    complianceConfirmed: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getUserMock.mockResolvedValue({ data: { user: { id: "user-1" } } });
  userProfileFindUniqueMock.mockResolvedValue({
    id: "user-1",
    role: "agent",
    firstName: "Avery",
    lastName: "Agent",
    email: "avery@example.com",
    phone: null,
  });
  mailOrderUpdateManyMock.mockResolvedValue({ count: 1 });
  uploadCreateOnlyAtKeyMock.mockResolvedValue(undefined);
  deleteObjectsMock.mockResolvedValue(undefined);
  inspectArtworkMock.mockResolvedValue({ warnings: [] });
  parseListPreviewMock.mockReturnValue({
    error: null,
    rowCount: 1,
    columns: ["email"],
    fillPercent: { email: 100 },
    warnings: [],
  });
  sanitizeCsvForSpreadsheetMock.mockImplementation((value: string) => value);
  buildOrderBundleMock.mockResolvedValue(undefined);
  dispatchMailOrderOnceMock.mockResolvedValue(undefined);
  inngestSendMock.mockResolvedValue(undefined);
});

describe("POST /api/direct-mail/orders/[id]/submit", () => {
  it("removes sealed files when a later artwork file fails", async () => {
    mailOrderFindUniqueMock.mockResolvedValue(order([
      artwork("art-1"),
      artwork("art-2"),
    ]));
    downloadObjectWithinLimitMock
      .mockResolvedValueOnce({
        buffer: Buffer.from("%PDF-test"),
        mimeType: "application/pdf",
        byteSize: 9,
      })
      .mockRejectedValueOnce(new Error("storage unavailable"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    const sealedKey = uploadCreateOnlyAtKeyMock.mock.calls[0]?.[0] as string;
    expect(response.status).toBe(502);
    expect(deleteObjectsMock).toHaveBeenCalledWith([sealedKey]);
    expect(mailOrderUpdateManyMock).toHaveBeenCalledWith({
      where: { id: "order-1", status: "submitting" },
      data: { status: "draft" },
    });
  });

  it("removes all sealed files when a later submission step fails", async () => {
    mailOrderFindUniqueMock.mockResolvedValue(order());
    downloadObjectWithinLimitMock
      .mockResolvedValueOnce({
        buffer: Buffer.from("%PDF-test"),
        mimeType: "application/pdf",
        byteSize: 9,
      })
      .mockResolvedValueOnce({
        buffer: Buffer.from("email\nbuyer@example.com\n"),
        mimeType: "text/csv",
        byteSize: 24,
      });
    renderToBufferMock.mockRejectedValue(new Error("renderer unavailable"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    const sealedKeys = uploadCreateOnlyAtKeyMock.mock.calls.map(([key]) => key);
    expect(response.status).toBe(502);
    expect(sealedKeys).toHaveLength(2);
    expect(deleteObjectsMock).toHaveBeenCalledWith(sealedKeys);
  });

  it("returns the submitted order when post-commit dispatch fails", async () => {
    mailOrderFindUniqueMock.mockResolvedValue(order());
    downloadObjectWithinLimitMock
      .mockResolvedValueOnce({
        buffer: Buffer.from("%PDF-test"),
        mimeType: "application/pdf",
        byteSize: 9,
      })
      .mockResolvedValueOnce({
        buffer: Buffer.from("email\nbuyer@example.com\n"),
        mimeType: "text/csv",
        byteSize: 24,
      });
    renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-summary"));
    inngestSendMock.mockRejectedValue(new Error("enqueue unavailable"));
    dispatchMailOrderOnceMock.mockRejectedValue(new Error("dispatch unavailable"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      order: {
        id: "order-1",
        submittedAt: expect.any(String),
      },
    });
    expect(logApiErrorMock).toHaveBeenCalledWith(
      "direct-mail/dispatch-after-submit",
      expect.any(Error),
    );
    expect(deleteObjectsMock).not.toHaveBeenCalled();
  });

  it("removes the sealed summary when the final database claim fails", async () => {
    mailOrderFindUniqueMock.mockResolvedValue(order());
    mailOrderUpdateManyMock
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    downloadObjectWithinLimitMock
      .mockResolvedValueOnce({
        buffer: Buffer.from("%PDF-test"),
        mimeType: "application/pdf",
        byteSize: 9,
      })
      .mockResolvedValueOnce({
        buffer: Buffer.from("email\nbuyer@example.com\n"),
        mimeType: "text/csv",
        byteSize: 24,
      });
    renderToBufferMock.mockResolvedValue(Buffer.from("%PDF-summary"));

    const response = await POST(new Request("http://localhost"), {
      params: Promise.resolve({ id: "order-1" }),
    });

    const attemptKeys = uploadCreateOnlyAtKeyMock.mock.calls.map(([key]) => key);
    expect(response.status).toBe(409);
    expect(attemptKeys).toHaveLength(3);
    expect(attemptKeys.at(-1)).toContain("-summary-report.pdf");
    expect(deleteObjectsMock).toHaveBeenCalledWith(attemptKeys);
    expect(buildOrderBundleMock).not.toHaveBeenCalled();
  });
});
