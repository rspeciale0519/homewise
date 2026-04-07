import { beforeEach, describe, expect, it, vi } from "vitest";

const { createClientMock, userProfileFindUniqueMock, agentFindFirstMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  userProfileFindUniqueMock: vi.fn(),
  agentFindFirstMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: createClientMock,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userProfile: { findUnique: userProfileFindUniqueMock },
    agent: { findFirst: agentFindFirstMock },
  },
}));

import { isError, requireStaffApi } from "@/lib/admin-api";

describe("requireStaffApi", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows admins without requiring an agent link", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-1", email: "admin@example.com" } },
        }),
      },
    });
    userProfileFindUniqueMock.mockResolvedValue({
      id: "user-1",
      role: "admin",
    });

    const result = await requireStaffApi();

    expect(isError(result)).toBe(false);
    if (!isError(result)) {
      expect(result.isAdmin).toBe(true);
      expect(result.agentId).toBeNull();
    }
    expect(agentFindFirstMock).not.toHaveBeenCalled();
  });

  it("allows linked agents and returns their agent id", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-2", email: "agent@example.com" } },
        }),
      },
    });
    userProfileFindUniqueMock.mockResolvedValue({
      id: "user-2",
      role: "agent",
    });
    agentFindFirstMock.mockResolvedValue({ id: "agent-9" });

    const result = await requireStaffApi();

    expect(isError(result)).toBe(false);
    if (!isError(result)) {
      expect(result.isAdmin).toBe(false);
      expect(result.agentId).toBe("agent-9");
    }
  });

  it("rejects agents that are not linked to an Agent record", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-3", email: "agent@example.com" } },
        }),
      },
    });
    userProfileFindUniqueMock.mockResolvedValue({
      id: "user-3",
      role: "agent",
    });
    agentFindFirstMock.mockResolvedValue(null);

    const result = await requireStaffApi();

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.error.status).toBe(403);
      await expect(result.error.json()).resolves.toEqual({
        error: "Agent profile not linked",
      });
    }
  });

  it("rejects non-staff users", async () => {
    createClientMock.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "user-4", email: "user@example.com" } },
        }),
      },
    });
    userProfileFindUniqueMock.mockResolvedValue({
      id: "user-4",
      role: "user",
    });

    const result = await requireStaffApi();

    expect(isError(result)).toBe(true);
    if (isError(result)) {
      expect(result.error.status).toBe(403);
      await expect(result.error.json()).resolves.toEqual({
        error: "Forbidden",
      });
    }
  });
});
