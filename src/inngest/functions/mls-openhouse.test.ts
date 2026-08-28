import { describe, expect, it } from "vitest";
import {
  mergeOpenHouseSchedule,
  parseOpenHouseDateTime,
} from "./mls-openhouse";

const firstSlot = {
  date: "2026-07-01",
  startTime: "10:00:00",
  endTime: "12:00:00",
  startDateTime: "2026-07-01T14:00:00.000Z",
  endDateTime: "2026-07-01T16:00:00.000Z",
  openHouseKey: "open-1",
};

const secondSlot = {
  date: "2026-07-02",
  startTime: "13:00:00",
  endTime: "15:00:00",
  startDateTime: "2026-07-02T17:00:00.000Z",
  endDateTime: "2026-07-02T19:00:00.000Z",
  openHouseKey: "open-2",
};

describe("mergeOpenHouseSchedule", () => {
  it("preserves unchanged slots during an incremental update", () => {
    const changedSecondSlot = { ...secondSlot, remarks: "Updated" };
    const result = mergeOpenHouseSchedule([firstSlot, secondSlot], {
      clearAll: false,
      removedKeys: new Set(),
      upserts: [changedSecondSlot],
    });

    expect(result).toEqual([firstSlot, changedSecondSlot]);
  });

  it("removes only the hidden open-house key", () => {
    const result = mergeOpenHouseSchedule([firstSlot, secondSlot], {
      clearAll: false,
      removedKeys: new Set(["open-1"]),
      upserts: [],
    });

    expect(result).toEqual([secondSlot]);
  });
});

describe("parseOpenHouseDateTime", () => {
  it("interprets local summer time in America/New_York", () => {
    expect(parseOpenHouseDateTime("2026-07-01", "13:00:00")?.toISOString()).toBe(
      "2026-07-01T17:00:00.000Z",
    );
  });

  it("interprets local winter time in America/New_York", () => {
    expect(parseOpenHouseDateTime("2026-01-15", "13:00:00")?.toISOString()).toBe(
      "2026-01-15T18:00:00.000Z",
    );
  });

  it("preserves an explicit offset", () => {
    expect(
      parseOpenHouseDateTime("2026-07-01", "2026-07-01T13:00:00-04:00")?.toISOString(),
    ).toBe("2026-07-01T17:00:00.000Z");
  });
});
