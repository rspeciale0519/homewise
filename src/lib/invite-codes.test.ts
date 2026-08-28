import { beforeEach, describe, expect, it, vi } from "vitest";

const { updateManyMock } = vi.hoisted(() => ({
  updateManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { agent: { updateMany: updateManyMock } },
}));

import { consumeInviteCode } from "./invite-codes";

describe("consumeInviteCode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("claims an unused, unexpired invite once", async () => {
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      consumeInviteCode("invite-1", "user-1", " Agent@Example.com "),
    ).resolves.toBe(true);
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inviteCode: "invite-1",
          inviteUsed: false,
          userId: null,
          email: {
            equals: "Agent@Example.com",
            mode: "insensitive",
          },
        }),
        data: { inviteUsed: true, userId: "user-1" },
      }),
    );
  });

  it("rejects an invite that another request already claimed", async () => {
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      consumeInviteCode("invite-1", "user-2", "agent@example.com"),
    ).resolves.toBe(false);
  });

  it("rejects an invite claim when the account has no email", async () => {
    await expect(consumeInviteCode("invite-1", "user-1", " ")).resolves.toBe(false);
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
