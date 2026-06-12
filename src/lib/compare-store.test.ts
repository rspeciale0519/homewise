import { describe, expect, it } from "vitest";
import { addCompareId, removeCompareId, toggleCompareId, COMPARE_MAX } from "./compare-store";

describe("compare store", () => {
  it("adds ids up to the maximum and ignores duplicates", () => {
    let ids: string[] = [];
    for (const id of ["a", "b", "a", "c", "d", "e"]) {
      ids = addCompareId(ids, id);
    }
    expect(ids).toEqual(["a", "b", "c", "d"]);
    expect(ids.length).toBe(COMPARE_MAX);
  });

  it("removes and toggles ids", () => {
    expect(removeCompareId(["a", "b"], "a")).toEqual(["b"]);
    expect(toggleCompareId(["a"], "a")).toEqual([]);
    expect(toggleCompareId(["a"], "b")).toEqual(["a", "b"]);
  });
});
