-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "platform" TEXT NOT NULL DEFAULT 'homewise',
ADD COLUMN     "upgradedFromRiusaAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "BundleConfig" ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY['homewise']::TEXT[];

-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY['homewise']::TEXT[];

-- AlterTable
ALTER TABLE "EntitlementConfig" ADD COLUMN     "platforms" TEXT[] DEFAULT ARRAY['homewise']::TEXT[];

-- CreateIndex
CREATE INDEX "Agent_platform_idx" ON "Agent"("platform");

-- GIN indexes for array lookups
CREATE INDEX "BundleConfig_platforms_idx" ON "BundleConfig" USING GIN ("platforms");
CREATE INDEX "EntitlementConfig_platforms_idx" ON "EntitlementConfig" USING GIN ("platforms");
CREATE INDEX "Document_platforms_idx" ON "Document" USING GIN ("platforms");

-- Rename the annual fee bundle to RIUSA dues
UPDATE "BundleConfig"
SET slug = 'riusa_annual_dues',
    name = 'RIUSA Annual Dues',
    description = 'Annual membership dues for Realty International USA agents.',
    "annualAmount" = 19500,
    platforms = ARRAY['riusa']
WHERE slug = 'annual_brokerage_membership';
