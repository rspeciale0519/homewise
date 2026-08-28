import { beforeEach, describe, expect, it, vi } from "vitest";

const { listingFindManyMock, listingUpdateManyMock } = vi.hoisted(() => ({
  listingFindManyMock: vi.fn(),
  listingUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findMany: listingFindManyMock,
      updateMany: listingUpdateManyMock,
    },
  },
}));

import { clearExpiredOpenHouseSchedules } from "./mls-openhouse";

const futureSchedule = [{ endDateTime: "2099-01-01T00:00:00.000Z" }];
const expiredSchedule = [{ endDateTime: "2020-01-01T00:00:00.000Z" }];

beforeEach(() => {
  vi.clearAllMocks();
  listingUpdateManyMock.mockResolvedValue({ count: 1 });
});

describe("clearExpiredOpenHouseSchedules", () => {
  it("continues after a full page with no expired schedules", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `listing-${String(index).padStart(4, "0")}`,
      openHouseSchedule: futureSchedule,
    }));
    listingFindManyMock
      .mockResolvedValueOnce(firstPage)
      .mockResolvedValueOnce([
        { id: "listing-1000", openHouseSchedule: expiredSchedule },
      ]);

    await expect(
      clearExpiredOpenHouseSchedules(new Date("2026-08-27T00:00:00.000Z")),
    ).resolves.toBe(1);

    expect(listingFindManyMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({ id: { gt: "listing-0999" } }),
      }),
    );
    expect(listingUpdateManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["listing-1000"] } },
      data: { openHouseSchedule: expect.anything() },
    });
  });
});
