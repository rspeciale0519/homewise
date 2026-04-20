-- Rename tables
ALTER TABLE "BundleConfig" RENAME TO "ProductConfig";
ALTER TABLE "BundleFeature" RENAME TO "ProductFeature";

-- Rename FK column on ProductFeature (was bundleId)
ALTER TABLE "ProductFeature" RENAME COLUMN "bundleId" TO "productId";

-- Drop old indexes/constraints and create new ones
ALTER INDEX "BundleConfig_slug_key" RENAME TO "ProductConfig_slug_key";
ALTER INDEX "BundleConfig_platforms_idx" RENAME TO "ProductConfig_platforms_idx";
ALTER INDEX "BundleFeature_bundleId_featureKey_key" RENAME TO "ProductFeature_productId_featureKey_key";
ALTER INDEX "BundleFeature_bundleId_idx" RENAME TO "ProductFeature_productId_idx";

-- Rename FK constraint
ALTER TABLE "ProductFeature" RENAME CONSTRAINT "BundleFeature_bundleId_fkey" TO "ProductFeature_productId_fkey";
