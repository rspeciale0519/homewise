import { describe, it, expect } from "vitest";
import {
  filterAgents,
  getAgentBySlug,
  MOCK_AGENTS,
  AVAILABLE_LANGUAGES,
} from "../../archive/data-mock-agents";
import { agentFilterSchema } from "../../src/schemas/agent-filter.schema";

describe("Mock Agent Data", () => {
  it("contains 15 agents", () => {
    expect(MOCK_AGENTS).toHaveLength(15);
  });

  it("every agent has required fields", () => {
    for (const agent of MOCK_AGENTS) {
      expect(agent.id).toBeTruthy();
      expect(agent.firstName).toBeTruthy();
      expect(agent.lastName).toBeTruthy();
      expect(agent.slug).toBeTruthy();
      expect(agent.email).toBeTruthy();
      expect(agent.phone).toBeTruthy();
      expect(agent.languages.length).toBeGreaterThan(0);
      expect(agent.bio).toBeTruthy();
    }
  });

  it("all slugs are unique", () => {
    const slugs = MOCK_AGENTS.map((a) => a.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("extracts available languages correctly", () => {
    expect(AVAILABLE_LANGUAGES).toContain("English");
    expect(AVAILABLE_LANGUAGES).toContain("Spanish");
    expect(AVAILABLE_LANGUAGES.length).toBeGreaterThan(3);
  });
});

describe("getAgentBySlug", () => {
  it("returns agent for valid slug", () => {
    const agent = getAgentBySlug("maria-alvarez");
    expect(agent).toBeDefined();
    expect(agent?.firstName).toBe("Maria");
    expect(agent?.lastName).toBe("Alvarez");
  });

  it("returns undefined for nonexistent slug", () => {
    expect(getAgentBySlug("nonexistent-agent")).toBeUndefined();
  });
});

describe("filterAgents", () => {
  it("returns all active agents with no filters", () => {
    const result = filterAgents({});
    const activeCount = MOCK_AGENTS.filter((a) => a.active).length;
    expect(result.total).toBe(activeCount);
  });

  it("filters by language", () => {
    const result = filterAgents({ language: "Spanish" });
    expect(result.total).toBeGreaterThan(0);
    for (const agent of result.agents) {
      expect(agent.languages).toContain("Spanish");
    }
  });

  it("filters by letter", () => {
    const result = filterAgents({ letter: "A" });
    expect(result.total).toBeGreaterThan(0);
    for (const agent of result.agents) {
      expect(agent.lastName.charAt(0).toUpperCase()).toBe("A");
    }
  });

  it("filters by search query", () => {
    const result = filterAgents({ search: "Maria" });
    expect(result.total).toBeGreaterThan(0);
    expect(result.agents[0]?.firstName).toBe("Maria");
  });

  it("combines filters correctly", () => {
    const result = filterAgents({ language: "Spanish", letter: "A" });
    for (const agent of result.agents) {
      expect(agent.languages).toContain("Spanish");
      expect(agent.lastName.charAt(0).toUpperCase()).toBe("A");
    }
  });

  it("returns empty array for impossible filter", () => {
    const result = filterAgents({ letter: "X" });
    expect(result.agents).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("sorts results by last name", () => {
    const result = filterAgents({});
    for (let i = 1; i < result.agents.length; i++) {
      const prev = result.agents[i - 1];
      const curr = result.agents[i];
      if (prev && curr) {
        expect(prev.lastName.localeCompare(curr.lastName)).toBeLessThanOrEqual(0);
      }
    }
  });

  it("paginates correctly", () => {
    const page1 = filterAgents({ perPage: 5, page: 1 });
    const page2 = filterAgents({ perPage: 5, page: 2 });
    expect(page1.agents.length).toBeLessThanOrEqual(5);
    expect(page2.agents.length).toBeLessThanOrEqual(5);
    expect(page1.totalPages).toBeGreaterThan(1);

    if (page1.agents[0] && page2.agents[0]) {
      expect(page1.agents[0].slug).not.toBe(page2.agents[0].slug);
    }
  });
});

describe("agentFilterSchema", () => {
  it("accepts valid filters", () => {
    const result = agentFilterSchema.safeParse({
      language: "Spanish",
      letter: "A",
      search: "Maria",
      page: "2",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.letter).toBe("A");
    }
  });

  it("rejects invalid letter", () => {
    const result = agentFilterSchema.safeParse({ letter: "AB" });
    expect(result.success).toBe(false);
  });

  it("rejects non-alpha letter", () => {
    const result = agentFilterSchema.safeParse({ letter: "1" });
    expect(result.success).toBe(false);
  });

  it("defaults page to 1", () => {
    const result = agentFilterSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
    }
  });

  it("coerces page string to number", () => {
    const result = agentFilterSchema.safeParse({ page: "3" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
    }
  });

  it("rejects negative page", () => {
    const result = agentFilterSchema.safeParse({ page: "-1" });
    expect(result.success).toBe(false);
  });
});
