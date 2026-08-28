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

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/invite-codes", () => ({
  consumeInviteCode: consumeInviteCodeMock,
}));

vi.mock("@/lib/training/enrollment", () => ({
  enrollAgentInAutomaticCourses: enrollAgentMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transactionMock,
    userProfile: { findUnique: profileFindUniqueMock },
  },
}));

vi.mock("@/lib/api-error", () => ({ logApiError: vi.fn() }));

import { GET } from "./route";

describe("GET /auth/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createClientMock.mockResolvedValue({
      auth: {
        exchangeCodeForSession: vi.fn().mockResolvedValue({
          data: {
            user: {
              id: "user-1",
              email: "agent@example.com",
              user_metadata: { first_name: "Ava", last_name: "Agent" },
            },
          },
          error: null,
        }),
      },
    });
    profileUpsertMock.mockResolvedValue({});
    profileUpdateMock.mockResolvedValue({});
    profileFindUniqueMock.mockResolvedValue({
      role: "user",
      defaultDashboardView: null,
    });
    enrollAgentMock.mockResolvedValue(1);
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

  it("creates the profile before linking an invited agent", async () => {
    consumeInviteCodeMock.mockResolvedValue(true);
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/callback?code=oauth-code&inviteCode=invite-1&redirectTo=/welcome",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe("https://app.homewisefl.com/welcome");
    expect(profileUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ id: "user-1", role: "user" }),
      }),
    );
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
    expect(enrollAgentMock).toHaveBeenCalledWith("user-1", expect.anything());
    expect(profileUpsertMock.mock.invocationCallOrder[0]).toBeLessThan(
      consumeInviteCodeMock.mock.invocationCallOrder[0] ?? Number.MAX_SAFE_INTEGER,
    );
  });

  it("keeps the user role when the invite cannot be claimed", async () => {
    consumeInviteCodeMock.mockResolvedValue(false);
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/callback?code=oauth-code&inviteCode=used&redirectTo=/welcome",
    );

    await GET(request);

    expect(profileUpsertMock).toHaveBeenCalled();
    expect(profileUpdateMock).not.toHaveBeenCalled();
    expect(enrollAgentMock).not.toHaveBeenCalled();
  });

  it("preserves the session invite for retry when profile setup fails", async () => {
    transactionMock.mockRejectedValueOnce(new Error("database unavailable"));
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/callback?code=oauth-code&inviteCode=invite-1&redirectTo=/welcome",
    );

    const response = await GET(request);

    expect(response.headers.get("location")).toBe(
      "https://app.homewisefl.com/auth/complete?redirectTo=%2Fwelcome",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "pending_agent_invite=invite-1",
    );
  });

  it("uses session recovery when the post-provisioning profile read fails", async () => {
    profileFindUniqueMock.mockRejectedValueOnce(new Error("database unavailable"));
    const request = new NextRequest(
      "https://app.homewisefl.com/auth/callback?code=oauth-code&inviteCode=invite-1",
    );

    const response = await GET(request);

    expect(transactionMock).toHaveBeenCalledOnce();
    expect(profileFindUniqueMock).toHaveBeenCalledWith({
      where: { id: "user-1" },
      select: { role: true, defaultDashboardView: true },
    });
    expect(response.headers.get("location")).toBe(
      "https://app.homewisefl.com/auth/complete?redirectTo=%2Fdashboard",
    );
    expect(response.headers.get("set-cookie")).toContain(
      "pending_agent_invite=invite-1",
    );
  });
});
