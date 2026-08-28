import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  applicationFindUniqueMock,
  transactionMock,
  claimUpdateManyMock,
  applicationUpdateMock,
  agentUpdateMock,
  createAgentRecordMock,
  sendEmailMock,
  revalidatePathMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  applicationFindUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  claimUpdateManyMock: vi.fn(),
  applicationUpdateMock: vi.fn(),
  agentUpdateMock: vi.fn(),
  createAgentRecordMock: vi.fn(),
  sendEmailMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (result: { error?: unknown }) => "error" in result,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agentApplication: { findUnique: applicationFindUniqueMock },
    $transaction: transactionMock,
  },
}));

vi.mock("@/lib/agents", () => ({ createAgentRecord: createAgentRecordMock }));
vi.mock("@/lib/invite-codes", () => ({
  generateInviteCode: () => "invite-1",
  getInviteExpiryDate: () => new Date("2026-09-01T00:00:00Z"),
}));
vi.mock("@/lib/email", () => ({ sendEmail: sendEmailMock }));
vi.mock("@/lib/email/templates", () => ({
  agentApplicationApprovedEmail: () => ({ subject: "Approved", html: "Body" }),
}));
vi.mock("@/lib/constants", () => ({ SITE_URL: "https://homewise.test" }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));

import { POST } from "./route";

const application = {
  id: "application-1",
  status: "pending",
  firstName: "Avery",
  lastName: "Agent",
  email: "avery@example.com",
  phone: null,
  mlsAgentId: null,
};

function request(body: unknown = {}) {
  return new NextRequest(
    "http://localhost/api/admin/agent-applications/application-1/approve",
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

const context = { params: Promise.resolve({ id: "application-1" }) };

beforeEach(() => {
  vi.clearAllMocks();
  requireAdminApiMock.mockResolvedValue({ profile: { id: "admin-1" } });
  applicationFindUniqueMock.mockResolvedValue(application);
  transactionMock.mockImplementation(
    async (handler: (transaction: unknown) => Promise<unknown>) =>
      handler({
        agentApplication: {
          updateMany: claimUpdateManyMock,
          update: applicationUpdateMock,
        },
        agent: { update: agentUpdateMock },
      }),
  );
});

describe("POST /api/admin/agent-applications/[id]/approve", () => {
  it("stops when another review claims the application first", async () => {
    claimUpdateManyMock.mockResolvedValue({ count: 0 });

    const response = await POST(request(), context);

    expect(response.status).toBe(409);
    expect(createAgentRecordMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("claims before creating an agent and hides provider email errors", async () => {
    claimUpdateManyMock.mockResolvedValue({ count: 1 });
    createAgentRecordMock.mockResolvedValue({ id: "agent-1" });
    agentUpdateMock.mockResolvedValue({});
    applicationUpdateMock.mockResolvedValue({});
    sendEmailMock.mockResolvedValue({ id: null, error: "secret provider detail" });

    const response = await POST(request(), context);
    const body = (await response.json()) as { emailWarning: string };

    expect(response.status).toBe(200);
    expect(claimUpdateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "application-1", status: "pending" },
      }),
    );
    expect(body.emailWarning).toBe(
      "Email delivery failed — share the invite link manually.",
    );
    expect(JSON.stringify(body)).not.toContain("secret provider detail");
  });
});
