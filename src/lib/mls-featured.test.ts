import { afterEach, describe, expect, it } from "vitest";
import { isHomewiseOffice, parseOfficeIds } from "./mls-featured";

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("MLS featured office helpers", () => {
  it("parses comma-separated office IDs", () => {
    expect(parseOfficeIds(" HW1,HW2 , , HW3 ")).toEqual(["HW1", "HW2", "HW3"]);
  });

  it("returns an empty list for missing config", () => {
    expect(parseOfficeIds(undefined)).toEqual([]);
  });

  it("matches HomeWise offices from env config", () => {
    process.env.HOMEWISE_OFFICE_MLS_ID = "HW1, HW2";

    expect(isHomewiseOffice("HW2")).toBe(true);
    expect(isHomewiseOffice("OTHER")).toBe(false);
  });

  it("returns false with no config", () => {
    delete process.env.HOMEWISE_OFFICE_MLS_ID;

    expect(isHomewiseOffice("HW1")).toBe(false);
  });
});
