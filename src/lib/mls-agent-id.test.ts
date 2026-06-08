import { describe, expect, it } from "vitest";
import { normalizeMlsAgentId } from "./mls-agent-id";

describe("normalizeMlsAgentId", () => {
  it("trims and uppercases MLS agent ids", () => {
    expect(normalizeMlsAgentId("  abc-001  ")).toBe("ABC-001");
  });

  it("returns null for blank or missing ids", () => {
    expect(normalizeMlsAgentId("   ")).toBeNull();
    expect(normalizeMlsAgentId(null)).toBeNull();
    expect(normalizeMlsAgentId(undefined)).toBeNull();
  });
});
