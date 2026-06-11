import { afterEach, describe, expect, it } from "vitest";
import { mlsPublicSearchEnabled } from "@/lib/mls-launch";
import { createProvider } from "./index";

describe("property provider launch gate", () => {
  afterEach(() => {
    delete process.env.MLS_PUBLIC_SEARCH_ENABLED;
    delete process.env.PROPERTY_PROVIDER;
  });

  it("keeps MLS public search disabled by default", () => {
    process.env.PROPERTY_PROVIDER = "stellar";

    expect(mlsPublicSearchEnabled()).toBe(false);
    expect(createProvider().constructor.name).toBe("MockPropertyProvider");
  });

  it("uses the Stellar provider only when explicitly launched", () => {
    process.env.MLS_PUBLIC_SEARCH_ENABLED = "true";
    process.env.PROPERTY_PROVIDER = "stellar";

    expect(mlsPublicSearchEnabled()).toBe(true);
    expect(createProvider().constructor.name).toBe("StellarMlsProvider");
  });
});
