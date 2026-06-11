import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { withIdx } from "./mls-visibility";

const IDX_READ_SURFACES = [
  "src/providers/stellar-mls-provider.ts",
  "src/components/properties/featured-listings-widget.tsx",
  "src/components/agents/agent-listings-widget.tsx",
  "src/app/(marketing)/page.tsx",
  "src/app/(marketing)/agents/[slug]/listings/page.tsx",
  "src/app/sitemap.ts",
  "src/lib/chatbot/public-site.ts",
  "src/lib/chatbot/agent-website.ts",
  "src/lib/ai/embeddings.ts",
  "src/inngest/functions/generate-embeddings.ts",
  "src/inngest/functions/seo-content-generator.ts",
  "src/inngest/functions/listing-alerts.ts",
  "src/inngest/functions/smart-alerts.ts",
  "src/inngest/functions/price-change-alerts.ts",
];

describe("MLS IDX visibility integration", () => {
  it("keeps the central IDX clause intact", () => {
    expect(withIdx({ status: "Active" })).toEqual({
      status: "Active",
      mlgCanUse: { has: "IDX" },
    });
  });

  it.each(IDX_READ_SURFACES)("%s uses the central IDX helper", (filePath) => {
    const source = readFileSync(join(process.cwd(), filePath), "utf8");

    expect(source).toContain("withIdx(");
  });
});
