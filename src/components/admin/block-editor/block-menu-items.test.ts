import { describe, expect, it } from "vitest";
import {
  BLOCK_COMMANDS,
  filterBlockCommands,
} from "./block-menu-items";

describe("filterBlockCommands", () => {
  it("returns the full catalogue for an empty query", () => {
    expect(filterBlockCommands("")).toHaveLength(BLOCK_COMMANDS.length);
  });

  it("returns the full catalogue for whitespace-only query", () => {
    expect(filterBlockCommands("   ")).toHaveLength(BLOCK_COMMANDS.length);
  });

  it("filters by label substring (case-insensitive)", () => {
    const res = filterBlockCommands("head");
    expect(res.map((c) => c.id)).toEqual(["h1", "h2", "h3"]);
  });

  it("matches keyword aliases that aren't in the label", () => {
    const res = filterBlockCommands("ul");
    expect(res.some((c) => c.id === "bullet-list")).toBe(true);
  });

  it("matches by full keyword (todo)", () => {
    const res = filterBlockCommands("todo");
    expect(res.map((c) => c.id)).toContain("task-list");
  });

  it("returns empty list when nothing matches", () => {
    expect(filterBlockCommands("nonexistentblocktype")).toEqual([]);
  });

  it("is case-insensitive on both label and keywords", () => {
    expect(
      filterBlockCommands("Bullet").some((c) => c.id === "bullet-list"),
    ).toBe(true);
    expect(
      filterBlockCommands("CODE").some((c) => c.id === "code"),
    ).toBe(true);
  });

  it("does not mutate the source catalogue", () => {
    const before = [...BLOCK_COMMANDS];
    filterBlockCommands("heading");
    expect([...BLOCK_COMMANDS]).toEqual(before);
  });
});
