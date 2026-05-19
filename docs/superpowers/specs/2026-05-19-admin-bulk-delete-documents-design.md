# Spec: Admin Bulk Delete — Document Library

- **Date:** 2026-05-19
- **Branch:** `feature/document-library`
- **Status:** Design approved; pending written-spec review
- **Author:** brainstorming session

## 1. Summary

Give admins the ability to permanently bulk-delete documents from the
**Documents Library**, scoped either to the entire library or to a filter
(section, optionally narrowed to a single category). The action is a
permanent hard delete consistent with the existing single-document delete,
gated behind a typed confirmation and recorded in a dedicated audit table.

This feature operates **only** on the `Document` model (the Documents
Library). It never queries or deletes `TransactionDocument` or any
transaction/deal paperwork that lives outside the library.

## 2. Background & Codebase Facts

- **Document model** is global — one shared library, no per-agent/org
  ownership. Organized via `DocumentCategoryMembership` (many-to-many) into
  `DocumentCategory` rows that each belong to a `section`
  (`office` | `listing` | `sales`).
- **Existing single delete** (`DELETE /api/admin/documents/[id]`): hard
  delete — removes the DB row, cascades to `DocumentDraft` /
  `DocumentFavorite` / `DocumentRecent` and `DocumentCategoryMembership`,
  and removes the Supabase storage object.
- **Storage backends:** `storageProvider` is `"local"` (legacy files in the
  repo `public/documents/`) or `"supabase"` (objects in the `documents`
  bucket).
- **Admin gate:** `requireAdminApi()` (`src/lib/admin-api.ts:91`) allows
  exactly `role === "admin"`. Roles are only `user | agent | admin`. There
  is **no** super-admin role; none is introduced here.
- **DB connectivity:** runs over the Supabase pgbouncer pooler in
  transaction mode (project CLAUDE.md Rule 8) — relevant to transaction
  duration (see §13).

## 3. Scope & Semantics

`scopeType` is one of `all | section | category`.

- **`all`** — every `Document` row. No filter. Includes uncategorized
  documents and `published: false` (hidden) documents.
- **`section`** — documents with **≥1 category membership in a category
  whose `section` equals the selected section**.
- **`category`** — documents with a membership in the specified category.
  `categoryId` must belong to the given `section` (validated by lookup).

Defined behaviors / consequences:

- The `published` flag is ignored — hidden documents in scope are deleted.
- **Cross-section bleed:** because membership is many-to-many, a document
  matched by a section/category scope is deleted in full even if it also
  appears in other sections — it disappears everywhere. The preview MUST
  surface this (see §6, §7).
- Uncategorized documents are removed only by `scopeType: "all"`.
- `local`-backed documents: their DB rows are deleted, but the physical
  files in the repo `public/documents/` are **not** removed (serverless
  read-only FS + project Rule 1). They vanish from the library; the only
  way they reappear is a developer deliberately hand-running
  `prisma/seed-documents.ts` — never automatically, on deploy, via CI, or
  via the admin UI, and `npm run db:seed` does not seed documents.
  Intentionally **not** surfaced in the modal: single-developer project,
  so the sole resurrection path is fully developer-controlled.

## 4. Authorization

Both endpoints call `requireAdminApi()`:

- No session / no profile → `401 Unauthorized`
- `role !== "admin"` → `403 Forbidden`

No new role tier. Client-side gating is never trusted; the server
re-validates the confirmation phrase and re-resolves the scope.

## 5. Data Model

New Prisma model + migration. No change to `Document`.

```prisma
model DocumentDeletionLog {
  id                    String   @id @default(cuid())
  adminUserId           String                    // UserProfile.id
  adminEmail            String?                   // denormalized for readability
  outcome               String   @default("executed") // "executed" | "blocked_scope_changed"
  scopeType             String                    // "all" | "section" | "category"
  section               String?                   // when scoped
  categoryId            String?                   // when scoped (no FK; may be gone)
  categoryName          String?                   // denormalized
  expectedDocumentCount Int?                       // count the admin confirmed at preview
  actualDocumentCount   Int?                       // count matched at execute time
  documentCount         Int                        // actually deleted (0 when blocked)
  draftCount            Int
  favoriteCount         Int
  recentCount           Int
  crossSectionCount     Int      @default(0)       // matched docs also in other sections
  storageRequested      Int      @default(0)       // supabase objects targeted
  storageRemoved        Int      @default(0)
  storageErrors         Int      @default(0)
  storageErrorKeys      String[] @default([])      // keys whose removal failed
  createdAt             DateTime @default(now())

  @@index([createdAt])
}
```

Every **executed** attempt writes one row — **including no-ops** (zero
matches) — *and* every **count-drift-blocked** attempt writes one row,
distinguished by `outcome` (all deletion/storage counts are `0` on a
blocked row, with `expectedDocumentCount` / `actualDocumentCount`
recorded). The log is the only forensic record (no backup exists).

## 6. API Design

New route: `src/app/api/admin/documents/bulk-delete/route.ts`. Thin —
delegates to `src/lib/documents/bulk-delete.ts`.

### 6.1 `GET` — preview

Query: `scopeType`, `section?`, `categoryId?`. Returns counts for the
resolved scope without deleting anything:

```json
{
  "documentCount": 47,
  "draftCount": 12,
  "favoriteCount": 30,
  "recentCount": 88,
  "crossSectionCount": 5
}
```

`crossSectionCount` is `0` for `scopeType: "all"`. Storage-object counts
are derived at execute time from the matched documents, not exposed in
the preview.

### 6.2 `POST` — execute

Request body (Zod-validated):

```json
{
  "scopeType": "all | section | category",
  "section": "office | listing | sales (when scoped)",
  "categoryId": "string (when scopeType=category)",
  "expectedDocumentCount": 47,
  "confirmationPhrase": "DELETE ALL"
}
```

Execution order:

1. `requireAdminApi()`.
2. Zod parse. `confirmationPhrase` must equal the exact constant
   `DELETE ALL` (case-sensitive) — else `400`.
3. Validate scope: `section` required+valid for `section`/`category`;
   `categoryId` required for `category` and must belong to `section`
   (lookup) — else `400`.
4. Resolve matched documents: select `id, storageProvider, storageKey`
   for the scope `where`. Compute `documentCount` (for the drift guard)
   and collect Supabase storage keys. Related-record counts for the log
   are taken inside the transaction in step 6 (authoritative).
5. **Count-drift guard:** if `actualDocumentCount > expectedDocumentCount`
   → write a `DocumentDeletionLog` row with `outcome:
   "blocked_scope_changed"`, all deletion/storage counts `0`, and
   `expectedDocumentCount` / `actualDocumentCount` recorded; then return
   `409 { error, code: "SCOPE_CHANGED", expected, actual }` (nothing
   deleted). `actual <= expected` proceeds (deleting fewer than approved
   is safe).
6. `prisma.$transaction(async tx => …, { timeout: 50_000, maxWait })` —
   kept minimal:
   - count `DocumentDraft`/`Favorite`/`Recent` where
     `documentId in matchedIds` (immediately before delete; cascade will
     remove them);
   - `tx.document.deleteMany({ where: { id: { in: matchedIds } } })`
     (cascades clean memberships/drafts/favorites/recents) — its `.count`
     is the authoritative `documentCount`;
   - `tx.documentDeletionLog.create(...)` with `outcome: "executed"`,
     all counts (storage fields initialized to requested/0/0/[]).
7. **After commit**, remove Supabase objects (provider `supabase` +
   `storageKey`) in conservative chunks; tally removed vs. failed; patch
   `storageRemoved`, `storageErrors`, `storageErrorKeys` onto the log row.
   Storage failure does not fail the request (DB already consistent).
8. Respond:

```json
{
  "success": true,
  "documentCount": 47,
  "draftCount": 12,
  "favoriteCount": 30,
  "recentCount": 88,
  "storageRequested": 29,
  "storageRemoved": 29,
  "storageErrors": 0
}
```

### 6.3 Scope resolution (`src/lib/documents/bulk-delete.ts`)

- `all` → `where: {}`.
- `section` → `where: { categories: { some: { category: { section } } } }`.
- `category` → `where: { categories: { some: { categoryId } } }`.
- `crossSectionCount` (scoped only): of the matched documents, the number
  that also have a membership in a category whose `section` differs from
  the selected one (`category` scope: any membership outside the selected
  category's section).
- Relation/field names above are illustrative — implementation matches the
  exact `schema.prisma` relation names for `Document ↔
  DocumentCategoryMembership ↔ DocumentCategory`.

## 7. UI / UX

A destructive **"Bulk delete"** button on the admin documents page
toolbar opens a modal (`src/app/admin/documents/bulk-delete-dialog.tsx`):

- **Scope selector:** radio *Entire library* vs *Scoped*. If scoped:
  Section select (Office/Listing/Sales) + optional Category select
  (categories loaded for the chosen section from the existing endpoint).
- **Live preview** (debounced `GET` on scope change):
  - "This permanently deletes **N documents**."
  - If `crossSectionCount > 0`: warning — "**X of these also appear in
    other sections and will be removed there too.**"
  - Drafts emphasis — "This also destroys **M agent drafts** (agents'
    in-progress, filled-in documents), F favorites, and R recents.
    **This cannot be undone.**"
- **Typed confirmation:** input must exactly equal `DELETE ALL`; the
  destructive button stays disabled until it matches.
- **Submit:** `POST` with scope + `expectedDocumentCount` (the previewed
  number) + `confirmationPhrase`.
  - `409 SCOPE_CHANGED` → re-fetch preview, show "the library changed
    since you reviewed — please re-check the numbers" and require
    re-confirmation.
  - Success → toast with counts; refresh the documents list; close modal.

## 8. Error Handling & Edge Cases

| Case | Result |
|---|---|
| No session / not admin | `401` / `403` |
| Zod failure / wrong/blank phrase | `400` with `fieldErrors` (existing pattern) |
| `category` scope, category missing or not in section | `400` |
| `expectedDocumentCount` omitted | `400` (required) |
| Actual matched count > expected | `409 SCOPE_CHANGED`, nothing deleted, **blocked log row written** |
| Zero matches | Proceed: `deleteMany` count 0, **log row still written**, no storage calls, `200` with zeros |
| DB transaction failure | Nothing deleted, no log row, `500` |
| Supabase removal failure | DB already consistent; failed keys + counts recorded on log; request still `200` |

## 9. Audit Logging

A row is written for:

- every **executed** attempt (`outcome: "executed"`) — including no-ops
  (zero matched documents); and
- every **count-drift-blocked** attempt (`outcome:
  "blocked_scope_changed"`) — recording who tried, the scope, and the
  expected vs. actual counts, with all deletion/storage counts `0`.

Only requests rejected *before* scope resolution write no row, because
no destructive intent was even evaluated: auth failures (`401`/`403`)
and validation/phrase failures (`400`). Each row captures admin
identity, scope, the counts, the cross-section count, and the storage
outcome — including the specific failed keys for later reconciliation.

## 10. Testing

Co-located `.test.ts`:

- `src/lib/documents/bulk-delete.test.ts`:
  - scope resolution for `all` / `section` / `category`;
  - uncategorized documents only matched by `all`;
  - a document spanning two sections counts once and increments
    `crossSectionCount`;
  - count accuracy (documents + drafts/favorites/recents);
  - `category` scope rejects a category not in the section;
  - confirmation-phrase validation (exact, case-sensitive).
- Route-level:
  - admin gate (`401`/`403`);
  - `400` on bad phrase / bad body / bad category;
  - `409` when actual > expected;
  - happy path returns correct counts and writes one log row;
  - no-op writes a zero-count log row;
  - transaction failure rolls back (no rows, no log);
  - storage-chunk failure records `storageErrorKeys` and still succeeds.

## 11. Non-Goals

- **`TransactionDocument` and any transaction/deal paperwork are never
  queried or deleted.** Only the `Document` (Documents Library) model.
- No soft delete, restore, undo, backup, or export.
- No physical deletion of local/bundled repo files
  (`public/documents/`); only Supabase storage objects are removed.
- No new role tier (uses the existing admin gate).
- No async/background job — synchronous request with a raised
  transaction timeout.
- No per-agent / per-org scoping (the library is global).

## 12. Files to Create / Modify

**Create**

- `prisma/schema.prisma` — add `DocumentDeletionLog`; generate migration
  under `prisma/migrations/`.
- `src/lib/documents/bulk-delete.ts` — scope resolution, `where` builder,
  count computation, cross-section detection, phrase constant +
  validation, storage-key collection, chunked-remove helper.
- `src/lib/documents/bulk-delete.test.ts`.
- `src/app/api/admin/documents/bulk-delete/route.ts` — `GET` preview +
  `POST` execute (thin; delegates to lib).
- `src/app/admin/documents/bulk-delete-dialog.tsx` — modal component.

**Modify**

- Admin documents page (`src/app/admin/documents/organize-view.tsx`
  and/or `page.tsx`) — toolbar button, wire modal, refresh on success.
- `src/types/document-library.ts` — shared preview/request/response
  types if helpful.

All source files stay within the project 450-LOC limit (route stays
thin; logic in the lib; modal is its own component).

## 13. Known Risks & Implementation Notes

- **Transaction duration over the pgbouncer pooler** (CLAUDE.md Rule 8):
  the interactive transaction is deliberately minimal (related counts +
  one `deleteMany` + one log insert). Raise the Prisma transaction
  `timeout` to **50s** and set `maxWait` accordingly. Accepted for the
  current library size;
  if the library grows very large, revisit with batched deletes (weaker
  atomicity).
- **Supabase Storage `remove()` batch limit is not yet verified** — chunk
  conservatively (e.g., 100 keys/call) and confirm the documented limit
  during implementation.
- **`in: matchedIds` payload size** — acceptable at current scale; note
  for future growth.
- **Count source of truth:** `documentCount` in the log = the
  `deleteMany().count`; related counts are measured inside the
  transaction immediately before the delete.
- **Local-backed documents:** DB rows are deleted; the bundled repo files
  remain. The only resurrection path is a developer deliberately
  hand-running `prisma/seed-documents.ts` (never automatic / deploy / CI /
  admin UI; `db:seed` excludes documents). Intentionally **not** surfaced
  in the UI — single-developer project, sole path is developer-controlled.
  Documented here for future maintainers.
