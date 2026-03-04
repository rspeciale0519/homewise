import { describe, it, expect } from "vitest";

/**
 * Lead routing validation logic (mirrors route handler checks).
 */
function validateCreateRule(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const { name, agentId } = body;
  if (!name || typeof name !== "string") return { valid: false, error: "name required" };
  if (!agentId || typeof agentId !== "string") return { valid: false, error: "agentId required" };
  return { valid: true };
}

function validateUpdateRule(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const { id } = body;
  if (!id || typeof id !== "string") return { valid: false, error: "id required" };
  return { valid: true };
}

function validateDeleteRule(body: Record<string, unknown>): { valid: boolean; error?: string } {
  const { id } = body;
  if (!id || typeof id !== "string") return { valid: false, error: "id required" };
  return { valid: true };
}

describe("Lead Routing - Create validation", () => {
  it("accepts valid create payload", () => {
    const result = validateCreateRule({ name: "Florida Rule", agentId: "agent-1" });
    expect(result.valid).toBe(true);
  });

  it("rejects missing name", () => {
    const result = validateCreateRule({ agentId: "agent-1" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("name required");
  });

  it("rejects missing agentId", () => {
    const result = validateCreateRule({ name: "Rule" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("agentId required");
  });

  it("rejects empty name", () => {
    const result = validateCreateRule({ name: "", agentId: "agent-1" });
    expect(result.valid).toBe(false);
  });

  it("rejects empty agentId", () => {
    const result = validateCreateRule({ name: "Rule", agentId: "" });
    expect(result.valid).toBe(false);
  });
});

describe("Lead Routing - Update validation", () => {
  it("accepts valid update payload", () => {
    const result = validateUpdateRule({ id: "rule-1", name: "Updated" });
    expect(result.valid).toBe(true);
  });

  it("rejects missing id", () => {
    const result = validateUpdateRule({ name: "Updated" });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("id required");
  });
});

describe("Lead Routing - Delete validation", () => {
  it("accepts valid delete payload", () => {
    const result = validateDeleteRule({ id: "rule-1" });
    expect(result.valid).toBe(true);
  });

  it("rejects missing id", () => {
    const result = validateDeleteRule({});
    expect(result.valid).toBe(false);
    expect(result.error).toBe("id required");
  });
});
