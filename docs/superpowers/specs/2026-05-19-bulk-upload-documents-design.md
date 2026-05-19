# Spec: Admin Bulk Upload — Document Library

- **Date:** 2026-05-19
- **Branch (planned):** `feature/bulk-upload`
- **Status:** Design approved by owner; planning to be hardened (Phase 1) then built (Phase 2)
- **Related:** builds on the same subsystem as the shipped admin bulk-delete feature

## 1. Summary

Let an admin upload **multiple documents at once** (drag-and-drop or file picker) into the
Document Library. Bulk-uploaded documents land **uncategorized** and **unpublished**, so the
admin can triage them into the right categories using the existing organize board and then
explicitly publish them.

## 2. Background & codebase facts (verified)

- **Single upload today** = `POST /api/admin/documents/upload` → admin-gated; validates
  extension + content-type; returns a Supabase **signed upload URL** + `storageKey` +
  `storageProvider:"supabase"`. The client then `PUT`s bytes directly to that URL.
  Allowed extensions: `.pdf .xlsx .xls .docx .doc .png .jpg .jpeg`.
- **Create document** = `POST /api/admin/documents` — Zod `createSchema` requires
  `categoryIds: z.array(z.string().min(1)).min(1, "Pick at least one category")`,
  `.refine(url || storageKey)`, defaults `published: true`, auto-generates a unique slug via
  `generateUniqueSlug(slugify(name), isSlugTakenForDocument)`.
- **`Document`** model: `slug` unique, `name`, `storageKey?`, `storageProvider` default
  `"local"`, `published` default `true`, `categories DocumentCategoryMembership[]`.
  `DocumentCategoryMembership`: `@@id([documentId, categoryId])`, `onDelete: Cascade`.
  **No DB-level constraint requires a membership** — the "≥1 category" rule lives only in
  the create API's Zod.
- **`DocumentCategory.section`** is a required string (`office|listing|sales`).
- **Organize board**: `src/app/admin/documents/organize-view.tsx` — section tabs
  Office/Listing/Sales; tree built from sections→categories→docs; drag-and-drop moves
  memberships; `OrganizeToolbar` holds Add Document + Bulk delete; `DocumentDrawer`
  add/edit; `ConfirmDialog`; `BulkDeleteDialog`. Helpers: `requireAdminApi`, `adminFetch`,
  `useToast`, `generateUniqueSlug`, `slugify`, `isSlugTakenForDocument`.
- **Agents** only ever see **published** documents; admins organize the full set.
- Test conventions: Vitest; route tests use `vi.hoisted` + `vi.mock("@/lib/prisma")` /
  `vi.mock("@/lib/admin-api")`; component tests use `@testing-library/react` +
  `fireEvent` (**`@testing-library/user-event` is NOT installed**).
- DB access uses the Supabase pooler (project CLAUDE.md Rule 8). Source files ≤ 450 LOC;
  TS strict, no `any`; no explanatory comments; co-located `.test` files.

## 3. Locked decisions

1. **"Uncategorized" = a `Document` with zero `DocumentCategoryMembership` rows**
   (Approach A). Section-agnostic, no magic values, **no schema change / no migration**.
2. Bulk-uploaded docs are created **`published: false`** with **no memberships**, and
   stay unpublished until the admin **explicitly** publishes them (publishing is a
   separate, explicit action even after categorizing).
3. Upload dialog is a **review list**: drag/drop + browse (multiple); per-file
   client validation (type + size) with ✗ + reason for invalid (excluded from upload);
   editable **name** per file (default = filename minus extension); per-file status
   (queued / uploading % / done / ✗); remove a queued/errored file; Retry failed.
4. The organize board gains a **4th tab "Uncategorized (n)"** alongside
   Office/Listing/Sales, listing membership-less docs with a live count.
5. Dedicated **`POST /api/admin/documents/bulk-create`** endpoint (the existing
   single-create route's `categoryIds.min(1)` rule stays intact).
6. Limits (tunable constants): per-file **25 MB**, max **50 files/batch**,
   **4** concurrent uploads.
7. Admin-only (`requireAdminApi`), reuses `adminFetch`/toast/Radix-dialog patterns
   established by the bulk-delete feature.

## 4. Data model

No schema change, no migration. A bulk-uploaded document is created with:
`name` (from filename, admin-editable), unique `slug` (auto), `storageProvider:"supabase"`,
`storageKey`, `mimeType?`, `sizeBytes?`, `published:false`, **and no `categories`**.
"Uncategorized" is the derived set `Document where categories: { none: {} }`.

## 5. API

### 5.1 Reuse `POST /api/admin/documents/upload` (unchanged)
Per file: client posts `{ filename, contentType }` → `{ uploadUrl, storageKey,
storageProvider }`. Client `PUT`s the file bytes to `uploadUrl`.

### 5.2 New `POST /api/admin/documents/bulk-create`
- `requireAdminApi()` gate (401/403).
- Zod body: `{ items: z.array(z.object({ name: z.string().min(1), storageKey:
  z.string().min(1), storageProvider: z.literal("supabase"), mimeType:
  z.string().optional().nullable(), sizeBytes: z.number().int().nonnegative()
  .optional().nullable() })).min(1).max(50) }`.
- Process items **sequentially, each create independent (NO wrapping
  `$transaction`)** so partial success is real. For each item: generate a unique slug
  (`generateUniqueSlug(slugify(name), isSlugTakenForDocument)`), then
  `prisma.document.create({ data: { slug, name, storageProvider:"supabase",
  storageKey, mimeType, sizeBytes, published:false } })` with **no `categories`**, in a
  `try/catch`. Success → push to `created:[{id,name,slug}]`; failure → push to
  `failed:[{name,error}]` and continue the remaining items (no rollback of prior
  successes). Slug uniqueness is safe: `generateUniqueSlug` checks the DB and `slug`
  has a unique constraint, so a rare race throws on that one item and it is recorded
  as `failed` without affecting others. Sequential processing keeps slug generation
  correct and the batch is bounded (≤50), so duration is acceptable.
- Response `200`: `{ created: [...], failed: [...] }`.
- 400 on Zod failure / >50 items.

### 5.3 Surface Uncategorized for the organize board
Extend the admin organize data source to also return the uncategorized set
(`Document` with `categories: { none: {} }`, admin sees regardless of `published`),
shaped like the existing library doc shape, so the board renders the
**"Uncategorized (n)"** tab. Moving a doc out = the **existing add-membership / move
flow** (creating the first `DocumentCategoryMembership`); once it has a membership it
leaves the Uncategorized set automatically. Publishing remains the existing explicit
publish toggle (`PATCH /api/admin/documents/[id] { published:true }`).

## 6. UI

- **`OrganizeToolbar`**: add a **"Bulk upload"** button + `onBulkUpload` prop
  (mirror the existing Bulk delete / Add Document button pattern; lucide `UploadCloud`).
- **`BulkUploadDialog`** (`src/app/admin/documents/bulk-upload-dialog.tsx`), Radix
  AlertDialog/Dialog styled like `BulkDeleteDialog`:
  - Dropzone (drag-over highlight) + hidden `<input type="file" multiple>` + browse
    button; `accept` set to the allowed types.
  - Client pre-validation per file: extension + content-type in the allowlist, and
    `size <= 25 MB`. Invalid → listed with ✗ + reason, excluded from upload.
  - Queue list rows: filename, editable **name** input (default filename minus ext),
    status (queued / uploading % / done / ✗ reason), remove ✕.
  - Upload: ≤4 concurrent; each file `POST /upload` → `PUT` bytes to signed URL with
    progress (XHR for progress events); collect successes.
  - On settle: `POST /bulk-create` with succeeded items → toast summary
    ("Uploaded N to Uncategorized; M failed"), refetch organize tree, switch the board
    to the Uncategorized tab. Failed items keep a **Retry** (retries only those).
  - Cancel: `AbortController` per in-flight PUT; if uploads in flight, the dialog
    confirms before closing; already-created docs are left (safe: unpublished,
    uncategorized).
- **Organize board**: a 4th tab `Uncategorized` with a count badge; rows use the
  existing actions (open, rename via `DocumentDrawer`, publish toggle, delete) and the
  existing drag flow to move into a real category.

## 7. Data flow (happy path)

Open dialog → drop N files → client validate → for each valid file (≤4 concurrent):
`POST /upload` → `PUT` bytes (progress) → collect → `POST /bulk-create {items}` →
docs created `published:false`, no membership → toast + refetch → board shows
**Uncategorized (N)** → admin drags into categories and explicitly publishes.

## 8. Error handling & edge cases

- Per-file signed-URL or PUT failure → row ✗ + reason; batch continues; Retry.
- `bulk-create` per-item failure → `failed[]`; created ones still land.
- Duplicate filenames/names allowed → slugs auto-uniquified server-side.
- Empty/zero valid files → upload button disabled; nothing sent.
- >50 valid files → block with a clear message (client) and 400 (server) as defense.
- Non-admin → 401/403 on both endpoints.
- Abort mid-batch → in-flight PUTs cancelled; partial results surfaced; no rollback.
- A file that uploaded to storage but whose `bulk-create` failed → orphaned storage
  object; acceptable (no DB row, invisible); note for future cleanup, do not block.
- Re-running upload of the same file → new storageKey (UUID-prefixed) + new slug; a
  duplicate Document is created (acceptable; admin can delete via existing single
  delete / bulk delete).

## 9. Limits

Tunable constants in `src/lib/documents/bulk-upload.ts`:
`MAX_FILE_BYTES = 25 * 1024 * 1024`, `MAX_BATCH = 50`, `UPLOAD_CONCURRENCY = 4`.
Enforced client-side (pre-validation) and server-side (`bulk-create` Zod `.max(50)`).

## 10. Testing

- **Unit** (`src/lib/documents/bulk-upload.ts` + `.test.ts`): file validation
  (type/size pass+fail), `nameFromFilename` (strip extension/edge cases),
  bounded-concurrency runner (order-independent, cap respected, collects
  results/errors).
- **Route** (`bulk-create/route.test.ts`, existing mock pattern): admin gate
  (401/403); Zod failure & >50 → 400; happy path creates `published:false` with no
  `categories` and auto slug; per-item failure recorded in `failed[]` while others
  succeed (partial success); slug uniqueness path.
- **Organize data**: the admin organize source returns membership-less docs in the
  uncategorized set and excludes them from section tabs.
- **Component** (`bulk-upload-dialog.test.tsx`, RTL + `fireEvent`): invalid file shows
  ✗ and is excluded; rename updates the payload name; remove drops a queued file;
  successful batch calls `onUploaded` with the result; partial failure shows Retry;
  upload button disabled with zero valid files.
- **Toolbar** (`organize-toolbar.test.tsx`): Bulk upload button calls `onBulkUpload`;
  hidden in preview mode; existing tests preserved.
- Full `npm run verify` (lint + type-check + vitest + build) green.

## 11. Non-goals (YAGNI)

No per-file category/description in the dialog; no auto-publish; no schema/migration;
no change to the existing single-create `≥1 category` rule; no async/background job;
no resumable/chunked uploads; no orphaned-storage reconciliation job (noted only).

## 12. Files

- **Create:** `src/lib/documents/bulk-upload.ts` (+ `.test.ts`);
  `src/app/api/admin/documents/bulk-create/route.ts` (+ `route.test.ts`);
  `src/app/admin/documents/bulk-upload-dialog.tsx` (+ `.test.tsx`).
- **Modify:** `src/components/admin/documents-organize/organize-toolbar.tsx`
  (+ button/prop; update its test); the admin organize data source + `organize-view.tsx`
  / section board to add the **Uncategorized** tab + its data (exact files pinned down
  in the implementation plan after tracing the organize tree builder).
- **Reuse unchanged:** `src/app/api/admin/documents/upload/route.ts`.

## 13. Known risks / Phase-1 must-resolve

- **Partial-success vs transaction** — resolved in §5.2 (per-item independent creates,
  no batch-wide rollback). Plan must implement exactly that.
- **Organize tree builder**: exact module(s) that build the section tree and the agent
  vs admin queries must be traced in the plan so adding the Uncategorized set doesn't
  regress section filtering or leak unpublished docs to agents.
- **Upload progress**: `fetch` lacks upload progress; use `XMLHttpRequest` for the
  signed-URL `PUT` to drive per-file `%` (or accept indeterminate progress — plan
  decides; XHR preferred).
- **450-LOC**: keep the dialog lean (extract a queue-row subcomponent / the upload
  runner into the lib) so `bulk-upload-dialog.tsx` stays under the limit.
