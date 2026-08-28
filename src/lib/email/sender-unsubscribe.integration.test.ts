import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SIGNED_LINK_SENDERS = [
  "src/inngest/functions/listing-alerts.ts",
  "src/inngest/functions/price-change-alerts.ts",
  "src/inngest/functions/open-house-digest.ts",
  "src/inngest/functions/monthly-market-email.ts",
  "src/inngest/functions/smart-alerts.ts",
  "src/inngest/functions/drip-campaign.ts",
  "src/inngest/functions/birthday-automations.ts",
  "src/inngest/functions/behavioral-triggers.ts",
  "src/app/api/admin/broadcasts/route.ts",
] as const;

const CONTACT_SUPPRESSION_CONSUMERS = [
  "src/inngest/functions/drip-campaign.ts",
  "src/inngest/functions/birthday-automations.ts",
  "src/inngest/functions/behavioral-triggers.ts",
  "src/app/api/admin/broadcasts/route.ts",
  "src/app/api/admin/campaigns/[id]/enroll/route.ts",
] as const;

function source(filePath: string): string {
  return readFileSync(join(process.cwd(), filePath), "utf8");
}

describe("email sender unsubscribe integration", () => {
  it.each(SIGNED_LINK_SENDERS)("%s uses signed token links", (filePath) => {
    const contents = source(filePath);

    expect(contents).toContain("createUnsubscribeToken(");
    expect(contents).toContain("/unsubscribe?token=");
    expect(contents).not.toMatch(/\/unsubscribe\?(?:id|alert|search)=/);
  });

  it.each(CONTACT_SUPPRESSION_CONSUMERS)("%s enforces contact suppression", (filePath) => {
    expect(source(filePath)).toContain("marketingEmailOptOutAt");
  });

  it("filters disabled favorite price alerts", () => {
    expect(source("src/inngest/functions/price-change-alerts.ts")).toContain(
      "favoritePriceAlertsEnabled: true",
    );
  });
});
