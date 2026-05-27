-- Training Hub v1 — schema foundation
--
-- All changes are additive or in-place data conversions. The old
-- `TrainingContent.category` string column is preserved for one release; it
-- will be dropped in v2 once the FK transition has bedded in.
--
-- Wrapped in a single transaction so a failure rolls back the entire change.

BEGIN;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. New enums
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE "TrainingContentStatus" AS ENUM ('draft', 'scheduled', 'published', 'archived');
CREATE TYPE "TrainingAudience" AS ENUM ('agent_only', 'public_only', 'both');

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Normalize existing TrainingContent.audience values to the new enum names
--    BEFORE casting the column. Existing values: 'agent' | 'public' | 'both'.
-- ─────────────────────────────────────────────────────────────────────────────

UPDATE "TrainingContent" SET "audience" = 'agent_only'  WHERE "audience" = 'agent';
UPDATE "TrainingContent" SET "audience" = 'public_only' WHERE "audience" = 'public';
-- 'both' already matches the new enum value.

ALTER TABLE "TrainingContent"
  ALTER COLUMN "audience" DROP DEFAULT,
  ALTER COLUMN "audience" TYPE "TrainingAudience" USING "audience"::"TrainingAudience",
  ALTER COLUMN "audience" SET DEFAULT 'agent_only';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. TrainingContent: add status + publishedAt with in-place backfill.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "TrainingContent" ADD COLUMN "status" "TrainingContentStatus" NOT NULL DEFAULT 'draft';
UPDATE "TrainingContent" SET "status" = 'published' WHERE "published" = true;

ALTER TABLE "TrainingContent" ADD COLUMN "publishedAt" TIMESTAMP(3);
UPDATE "TrainingContent" SET "publishedAt" = "updatedAt" WHERE "published" = true;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. TrainingContent: SEO + read-time fields (all nullable).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "TrainingContent"
  ADD COLUMN "seoTitle" TEXT,
  ADD COLUMN "seoDescription" TEXT,
  ADD COLUMN "ogImageUrl" TEXT,
  ADD COLUMN "readTimeMinutes" INTEGER;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. TrainingCategory entity + backfill from DISTINCT TrainingContent.category.
--    Deterministic id of the form "cat-<slug>" so the categoryId backfill can
--    derive the FK directly from the existing string value.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "TrainingCategory" (
  "id"           TEXT NOT NULL,
  "name"         TEXT NOT NULL,
  "slug"         TEXT NOT NULL,
  "description"  TEXT,
  "heroImageUrl" TEXT,
  "sortOrder"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingCategory_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingCategory_slug_key" UNIQUE ("slug")
);
CREATE INDEX "TrainingCategory_sortOrder_idx" ON "TrainingCategory"("sortOrder");

-- Helper expression: normalize a category string into a slug fragment.
-- Lowercase, swap underscores for hyphens, collapse non-[a-z0-9-] to hyphens,
-- trim leading/trailing hyphens.
-- Used twice (id + slug) and again in the categoryId backfill below.
INSERT INTO "TrainingCategory" ("id", "name", "slug", "sortOrder", "createdAt", "updatedAt")
SELECT
  'cat-' || TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REPLACE("category", '_', '-')), '[^a-z0-9-]+', '-', 'g')) AS "id",
  "category" AS "name",
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REPLACE("category", '_', '-')), '[^a-z0-9-]+', '-', 'g')) AS "slug",
  0 AS "sortOrder",
  CURRENT_TIMESTAMP AS "createdAt",
  CURRENT_TIMESTAMP AS "updatedAt"
FROM (
  SELECT DISTINCT "category"
  FROM "TrainingContent"
  WHERE "category" IS NOT NULL AND TRIM("category") <> ''
) sub
ON CONFLICT ("slug") DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. TrainingContent.categoryId FK (nullable). Backfill before adding the
--    foreign-key constraint so the constraint never sees orphan rows.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "TrainingContent" ADD COLUMN "categoryId" TEXT;
UPDATE "TrainingContent"
SET "categoryId" =
  'cat-' || TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REPLACE("category", '_', '-')), '[^a-z0-9-]+', '-', 'g'))
WHERE "category" IS NOT NULL AND TRIM("category") <> '';

ALTER TABLE "TrainingContent"
  ADD CONSTRAINT "TrainingContent_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "TrainingCategory"("id") ON DELETE SET NULL;
CREATE INDEX "TrainingContent_categoryId_idx" ON "TrainingContent"("categoryId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. TrainingSection entity + backfill: one default "Lessons" section per
--    existing TrainingTrack (course). Section id is deterministic.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE "TrainingSection" (
  "id"        TEXT NOT NULL,
  "courseId"  TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "dripDays"  INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TrainingSection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TrainingSection_courseId_fkey"
    FOREIGN KEY ("courseId") REFERENCES "TrainingTrack"("id") ON DELETE CASCADE
);
CREATE INDEX "TrainingSection_courseId_idx" ON "TrainingSection"("courseId");

INSERT INTO "TrainingSection" ("id", "courseId", "title", "sortOrder", "createdAt", "updatedAt")
SELECT 'sec-' || "id", "id", 'Lessons', 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "TrainingTrack";

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. TrainingTrackItem.sectionId FK. Backfill BEFORE adding the FK constraint.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "TrainingTrackItem" ADD COLUMN "sectionId" TEXT;
UPDATE "TrainingTrackItem" SET "sectionId" = 'sec-' || "trackId";

ALTER TABLE "TrainingTrackItem"
  ADD CONSTRAINT "TrainingTrackItem_sectionId_fkey"
  FOREIGN KEY ("sectionId") REFERENCES "TrainingSection"("id") ON DELETE CASCADE;
CREATE INDEX "TrainingTrackItem_sectionId_idx" ON "TrainingTrackItem"("sectionId");

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. TrainingTrack (course) additions.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE "TrainingTrack"
  ADD COLUMN "slug"          TEXT,
  ADD COLUMN "audience"      "TrainingAudience" NOT NULL DEFAULT 'agent_only',
  ADD COLUMN "dueDays"       INTEGER,
  ADD COLUMN "recurDays"     INTEGER,
  ADD COLUMN "passThreshold" INTEGER NOT NULL DEFAULT 80;

-- Backfill slugs: slugified name + 6-char id suffix to guarantee uniqueness.
UPDATE "TrainingTrack"
SET "slug" =
  TRIM(BOTH '-' FROM REGEXP_REPLACE(LOWER(REPLACE("name", ' ', '-')), '[^a-z0-9-]+', '-', 'g'))
  || '-' || SUBSTRING("id", 1, 6);

CREATE UNIQUE INDEX "TrainingTrack_slug_key" ON "TrainingTrack"("slug");

COMMIT;
