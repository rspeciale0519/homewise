// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  consumeInviteCodeMock,
  createClientMock,
  enrollAgentMock,
  profileFindUniqueMock,
  profileUpdateMock,
  profileUpsertMock,
  transactionMock,
} = vi.hoisted(() => ({
  consumeInviteCodeMock: vi.fn(),
  createClientMock: vi.fn(),
  enrollAgentMock: vi.fn(),
  profileFindUniqueMock: vi.fn(),
  profileUpdateMock: vi.fn(),
  profileUpsertMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/invite-codes", () => ({
  consumeInviteCode: consumeInviteCodeMock,
}));
vi.mock("@/lib/training/enrollment", () => ({
  enrollAgentInAutomaticCourses: enrollAgentMock,
}));
vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    userProfile: { findUnique: profileFindUniqueMock },
  },
}));

import { GET } from "./route";

beforeEach(() => {
  vi.clearAllMocks();
  createClientMock.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: "user-1",
            email: "agent@example.com",
            user_metadata: { first_name: "Ava", last_name: "Agent" },
          },
        },
      }),
    },
  });
  consumeInviteCodeMock.mockResolvedValue(true);
  enrollAgentMock.mockResolvedValue(1);
  profileFindUniqueMock.mockResolvedValue({
    role: "agent",
    defaultDashboardView: null,
  });
  transactionMock.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) => callback({
      userProfile: {
        upsert: profileUpsertMock,
        update: profileUpdateMock,
      },
      agent: {},
    }),
  );
});

describe("GET /auth/complete", () => {
  it("retries invite provisioning from the protected pending cookie", async () => {
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/complete?redirectTo=/welcome",
      { headers: { cookie: "pending_agent_invite=invite-1" } },
    );

    const response = await GET(request);

    expect(consumeInviteCodeMock).toHaveBeenCalledWith(
      "invite-1",
      "user-1",
      "agent@example.com",
      expect.anything(),
    );
    expect(profileUpdateMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { role: "agent" },
    });
    expect(response.headers.get("location")).toBe(
      "https://app.homewisefl.com/welcome",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "pending_agent_invite=;",
    );
  });

  it("returns a retryable response when the database remains unavailable", async () => {
    transactionMock.mockRejectedValueOnce(new Error("database unavailable"));
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/complete?redirectTo=/welcome",
      { headers: { cookie: "pending_agent_invite=invite-1" } },
    );

    const response = await GET(request);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Account setup is temporarily unavailable. Refresh this page to try again.",
    });
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});
