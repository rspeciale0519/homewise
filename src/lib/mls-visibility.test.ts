import { describe, expect, it } from "vitest";
import { IDX_WHERE, withIdx } from "./mls-visibility";

describe("MLS IDX visibility helpers", () => {
  it("exposes the IDX clause", () => {
    expect(IDX_WHERE).toEqual({ mlgCanUse: { has: "IDX" } });
  });

  it("merges into an existing where", () => {
    expect(withIdx({ city: "Tampa" })).toEqual({
      city: "Tampa",
      mlgCanUse: { has: "IDX" },
    });
  });

  it("merges into empty", () => {
    expect(withIdx()).toEqual({ mlgCanUse: { has: "IDX" } });
  });
});
