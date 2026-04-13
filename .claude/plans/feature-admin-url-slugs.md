# Feature: Admin-Controlled URL Slugs for Training Modules and Documents

## Context

Today, training module pages are routed by opaque CUID (`/dashboard/training/<cuid>`) and document pages are routed by file path (`/dashboard/documents/viewer?doc=office/foo.pdf`). Neither is shareable, SEO-friendly, or survives renames. Worse, documents aren't even a first-class concept in the database — they're hardcoded in `src/data/content/agent-resources.ts`, meaning every add/remove is a code change plus file drop in `/private/documents/`.

**Goal:** Every training module and every document has a human-readable URL slug that the admin sets (auto-generated from title with manual override) in an admin form. Slugs must be unique within their entity type, survive renames via 301 redirects, and be usable as the canonical URL.

**Why now:** The Document Library viewer shipped with fillable-form support; users will start sharing document links externally. Opaque path-based URLs are brittle (file renames break links) and expose storage layout. This also unlocks the bigger unspoken need — a document admin UI — which today does not exist.

**Decisions locked with user (2026-04-13):**
- **Scope:** Full. Training gets a slug column + form field. Documents get migrated from TS to a DB model with a brand-new admin UI (list/create/edit/delete/upload/slug).
- **Slug UX:** Auto-generate from title as the admin types, editable. Reusable `<SlugField>` component.
- **Rename policy:** Old slug → new slug via 301 redirect, backed by a `SlugHistory` table.

---

## Recommended Architecture

- **Unified `SlugHistory` table** (polymorphic via `entityType` + `entityId`) — one table serves both training and documents, and any future entity.
- **Document categories as a table** (`DocumentCategory`) — preserves the two-level TS structure (section → category → documents) without hardcoding category titles.
- **Many-to-many between `Document` and `DocumentCategory`** via `DocumentCategoryMembership`. This is a refinement over the first draft (which duplicated rows per category): one PDF that lives in both Listing and Sales tabs has **one** row, **one** slug (`lead-paint-disclosure`), and two memberships. Cleaner admin UX and URLs.
- **File storage:** keep `/private/documents/` for existing files during migration; new uploads route through a new `/api/admin/documents/upload` endpoint to the Supabase `documents` bucket. `Document.storageProvider` distinguishes the two.
- **Slug resolution helpers** (`resolveTrainingSlug`, `resolveDocumentSlug`): check current record first, fall back to `SlugHistory`, return `{ record, redirectFrom? }`. Pages 301 on `redirectFrom`.
- **Migration of path-keyed tables** (`DocumentDraft`, `DocumentFavorite`, `DocumentRecent`): add nullable `documentId`, dual-write during transition, backfill from `documentPath` lookups, finalize by dropping `documentPath` in the last phase.
- **Backward compat:** `/dashboard/training/<id>` continues to work via a thin redirect shim. `/dashboard/documents/viewer?doc=<path>` keeps working indefinitely so any already-shared link survives.

---

## Phases

### Phase 1 — Slug utilities + `TrainingContent.slug` column

**Create:**
- `src/lib/slug/slugify.ts` — `slugify(input)`, `isValidSlug(s)` (lowercase, `a-z0-9-`, no leading/trailing dashes, max 80 chars), `generateUniqueSlug(base, existsFn)`. Reserved list: `new`, `edit`, `admin`, `api`, `courses`.
- `src/lib/slug/resolve.ts` — `resolveTrainingSlug(slug)` returning `{ record, redirectFrom? }` from `TrainingContent` + `SlugHistory`.
- `prisma/migrations/<ts>_add_training_slug/migration.sql` — adds nullable `slug`, backfills via `regexp_replace(lower(title), ...)` with `-<short-id>` suffix for collisions, then adds `@unique`.

**Modify:**
- `prisma/schema.prisma` — add `slug String @unique` to `TrainingContent`. Add new `SlugHistory` model (scoped to training only at this stage; documents added in phase 3).
- `src/app/api/admin/training/route.ts` — extend `createSchema` with optional `slug`; auto-generate from title if missing; unique check against `TrainingContent` and `SlugHistory.oldSlug` (reserved).
- `src/app/api/admin/training/[id]/route.ts` — extend `updateSchema` with `slug`; on slug change, insert prior slug into `SlugHistory` (idempotent by unique `(entityType, oldSlug)`).

**Checkpoint:** `/git-workflow-planning:checkpoint 1 training slug column and utilities`

**Verify:** `npm run type-check`, `npm run lint`, `npx prisma migrate dev`, Prisma Studio spot-check that every existing row has a unique slug.

---

### Phase 2 — Training admin slug input + slug-based routing

**Create:**
- `src/components/admin/slug-field.tsx` — reusable `<SlugField title slug onChange />` component. Auto-syncs from `title` via effect until user manually edits; then stops syncing (`touched` state). Shows live preview (`/dashboard/training/<slug>`). Inline validation via `isValidSlug`.
- `src/app/dashboard/training/[slug]/page.tsx` — copy of current `[id]/page.tsx` but looks up by `resolveTrainingSlug`; 301 to canonical on `redirectFrom`.

**Modify:**
- `src/components/admin/training-content-drawer.tsx` — add `slug` state, render `<SlugField>` under the Title input; include `slug` in create/update payload; surface 409 uniqueness errors.
- `src/app/admin/training/types.ts` — add `slug: string` to `TrainingItem`.
- `src/components/training/module-card.tsx` — link `href={/dashboard/training/${slug}}`; accept `slug` prop.
- `src/app/dashboard/training/page.tsx` + `src/app/dashboard/training/courses/[id]/page.tsx` — pass `slug` to `ModuleCard`.
- `src/app/dashboard/training/[id]/page.tsx` — convert to a server-side shim: look up by id, `redirect(301, '/dashboard/training/' + slug)`.

**Checkpoint:** `/git-workflow-planning:checkpoint 2 training slug admin ui and public route`

**Verify:** typecheck, lint, manual test: create module (auto slug), rename slug, visit old slug URL → 301, visit `/<id>` → 301 to new slug.

---

### Phase 3 — Document + category models + seed from TS

**Create:**
- `prisma/migrations/<ts>_add_documents/migration.sql` — creates `Document`, `DocumentCategory`, `DocumentCategoryMembership` tables; adds `documentId` (nullable) to `DocumentDraft`/`DocumentFavorite`/`DocumentRecent`; extends `SlugHistory` usage (no schema change, just new `entityType = "document"` rows).
- `prisma/seed-documents.ts` — reads the TS constants, creates categories (dedup by slugified title + section), creates documents (dedup by `storageKey`), creates memberships for each occurrence. Flags `quickAccess: true` on docs in `QUICK_ACCESS_DOCUMENTS`.
- `src/lib/slug/resolve.ts` — extend with `resolveDocumentSlug(slug)`.

**Modify:**
- `prisma/schema.prisma`:
  - New `Document { id, slug @unique, name, description?, sectionPrimary, url?, external, storageKey?, storageProvider, mimeType?, sizeBytes?, sortOrder, published, quickAccess, createdAt, updatedAt, categories: DocumentCategoryMembership[], drafts/favorites/recents }`.
  - New `DocumentCategory { id, slug @unique, title, description?, section, sortOrder, memberships[] }`.
  - New `DocumentCategoryMembership { documentId, categoryId, sortOrder, @@id([documentId, categoryId]) }`.
  - `DocumentDraft`/`Favorite`/`Recent` — add nullable `documentId String?` + relation.
- `prisma/seed.ts` — invoke `seed-documents` after agents.

**Checkpoint:** `/git-workflow-planning:checkpoint 3 document models and seed migration`

**Verify:** typecheck, lint, `npx prisma migrate dev`, `npx prisma db seed`, Prisma Studio: row counts match TS source (~65 docs, ~9 categories, ~70 memberships).

---

### Phase 4 — Document admin UI

**Create:**
- `src/app/admin/documents/page.tsx` — server component: fetches documents + categories, renders `DocumentsAdminView`.
- `src/app/admin/documents/documents-admin-view.tsx` — client: tabs (Office / Listing / Sales / Quick Access), search, category filter, list table with row actions.
- `src/app/admin/documents/types.ts` — `DocumentItem`, `DocumentCategoryItem`.
- `src/components/admin/document-drawer.tsx` — mirrors `training-content-drawer.tsx`. Fields: Name, `<SlugField>`, Description, Section (enum select), Categories (multi-select, filtered by section), External toggle + URL OR file upload, Published, Quick Access.
- `src/components/admin/document-category-drawer.tsx` — CRUD for categories (title, slug, section, description, sortOrder).
- `src/app/api/admin/documents/route.ts` — `GET` list, `POST` create. Zod validates all fields incl. slug uniqueness + reserved.
- `src/app/api/admin/documents/[id]/route.ts` — `PATCH`, `DELETE`. On slug change → append to `SlugHistory`. On delete → remove Supabase storage object if `storageProvider="supabase"`.
- `src/app/api/admin/documents/upload/route.ts` — signed-URL upload to Supabase `documents` bucket (pattern copied from training upload).
- `src/app/api/admin/documents/categories/route.ts` and `[id]/route.ts` — category CRUD.

**Modify:**
- Admin nav (find `src/components/admin/admin-*.tsx` — wherever the training admin link lives) — add "Documents" entry.

**Checkpoint:** `/git-workflow-planning:checkpoint 4 document admin crud and upload`

**Verify:** typecheck, lint, manual: create external doc, create uploaded doc, add membership to two categories, rename slug (confirm history row), delete.

---

### Phase 5 — Public document routing + backward compat

**Create:**
- `src/app/dashboard/documents/[slug]/page.tsx` — slug landing: resolves via `resolveDocumentSlug`, 301 on redirect, renders the existing `PdfViewerShell` with a slug-based file URL.
- `src/app/api/documents/by-slug/[slug]/route.ts` — serves file by slug: auth → `Document` lookup → stream local file or redirect to Supabase signed URL.

**Modify:**
- `src/app/dashboard/agent-hub/documents/page.tsx` — fetch from `prisma.document.findMany({ include: { categories: ... } })`, group by section/category, pass to existing tabs UI. Drop TS import.
- `src/app/dashboard/documents/viewer/page.tsx` — accept `?slug=<slug>` param; resolve via `resolveDocumentSlug`; 301 on redirect; render viewer against `/api/documents/by-slug/<slug>`. Keep the existing `?doc=<path>` branch as-is for back-compat.
- `src/components/content/document-list.tsx` — construct links as `/dashboard/documents/viewer?slug=<doc.slug>`.
- `src/app/api/documents/favorites/route.ts`, `recents/route.ts`, `drafts/route.ts` — accept `documentId`; prefer it over `documentPath`; dual-write both columns during transition.
- `src/schemas/document-viewer.schema.ts` — add optional `documentId` to the three schemas.
- `src/hooks/use-track-document-view.ts` — include `documentId` when available.

**Checkpoint:** `/git-workflow-planning:checkpoint 5 public document slug routes and dual-write`

**Verify:** typecheck, lint, manual: library → viewer via slug; rename slug, confirm 301; old `?doc=office/foo.pdf` still works; favorite/draft/recent write succeed with both columns present in DB.

---

### Phase 6 — Finalize migration, drop `documentPath`

**Create:**
- `prisma/migrations/<ts>_finalize_document_references/migration.sql` — backfill lingering `documentId NULL` rows by joining `documentPath` against `Document.storageKey`; drop `documentPath` columns; switch unique constraints in `DocumentFavorite`/`Recent`/`Draft` to `(agentId, documentId)`.
- `scripts/verify-document-migration.ts` — counts, zero-orphan assertions.

**Modify:**
- `src/schemas/document-viewer.schema.ts` — remove `documentPath` fields.
- `src/app/api/documents/favorites/route.ts`, `recents/route.ts`, `drafts/route.ts` — `documentId`-only.
- `src/app/api/documents/export/route.ts` — look up `Document` by id, read file via `storageKey`.
- `src/app/dashboard/documents/viewer/page.tsx` — remove the path-based `findDocumentByPath` branch.
- `src/data/content/agent-resources.ts` — move document constants to `/archive` (per project rule: never delete).

**Checkpoint:** `/git-workflow-planning:checkpoint 6 finalize document migration`

**Verify:** typecheck, lint, run `verify-document-migration.ts` against a staging DB, full regression Playwright of library → viewer → favorites/drafts/recents.

---

## Critical Files to Read First (on kickoff)

- `prisma/schema.prisma` (existing `Agent.slug`, `SeoContent.slug` patterns)
- `src/components/admin/training-content-drawer.tsx` (drawer pattern)
- `src/app/api/admin/training/route.ts` + `[id]/route.ts` (admin Zod + upload patterns)
- `src/data/content/agent-resources.ts` (source for seed)
- `src/app/dashboard/documents/viewer/page.tsx` (existing resolver)
- `src/app/api/documents/[...path]/route.ts` (file-serving pattern)
- `src/app/api/documents/favorites/route.ts` (to understand what needs dual-write)

---

## Open Questions / Risks

1. **Reserved slugs:** `new`, `edit`, `admin`, `api`, `courses` are rejected by `isValidSlug`. Confirm with user if any others (e.g., `dashboard`, `settings`).
2. **SlugHistory growth:** unbounded. Acceptable at current scale; add `@@index([createdAt])` to enable future TTL.
3. **In-flight viewer sessions across a rename:** file already loaded in the iframe is unaffected; the next navigation gets a 301.
4. **Existing drafts when an admin renames a doc:** preserved because drafts become keyed by `documentId` (stable) in phase 5–6, not by slug.
5. **External-URL doc edits:** changing only the `url` field without changing slug does NOT create a `SlugHistory` entry.
6. **`generateMetadata` caching:** start with `dynamic = "force-dynamic"` on the slug pages so rename reflects instantly; optimize later with tag-based revalidation.
7. **Confirm with user whether categories need their own public slug URLs** (`/dashboard/documents/category/<slug>`) or only documents do. Current plan: only documents.
