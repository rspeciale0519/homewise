import { describe, it, expect } from "vitest";
import { platformSchema, platformsArraySchema } from "../platform.schema";

describe("platformSchema", () => {
  it("accepts 'homewise' and 'riusa'", () => {
    expect(platformSchema.parse("homewise")).toBe("homewise");
    expect(platformSchema.parse("riusa")).toBe("riusa");
  });

  it("rejects unknown values", () => {
    expect(() => platformSchema.parse("homewize")).toThrow();
    expect(() => platformSchema.parse("")).toThrow();
    expect(() => platformSchema.parse("HOMEWISE")).toThrow();
  });
});

describe("platformsArraySchema", () => {
  it("accepts single- and multi-value arrays of valid platforms", () => {
    expect(platformsArraySchema.parse(["homewise"])).toEqual(["homewise"]);
    expect(platformsArraySchema.parse(["homewise", "riusa"])).toEqual(["homewise", "riusa"]);
  });

  it("rejects empty arrays", () => {
    expect(() => platformsArraySchema.parse([])).toThrow();
  });

  it("rejects arrays with any unknown value", () => {
    expect(() => platformsArraySchema.parse(["homewise", "realty"])).toThrow();
  });
});
