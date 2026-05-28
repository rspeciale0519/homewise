# Training Hub v3 — Engagement, Discoverability & Analytics

Third branch in the Training Hub roadmap. Builds on
`feature-training-hub-v1.md` (foundation) and `feature-training-hub-v2.md`
(compliance teeth, quizzes, certificates). Assumes v1 + v2 are merged.

Goal of v3: make the Training Hub **sticky and measurable** — learners
discuss, annotate, and cross-navigate content; admins see what's working;
search stops being client-side filtering and becomes real full-text search.
This is the "platform maturity" layer; nothing here is compliance-critical,
so it ships only after v2's teeth are in.

## Locked architectural decisions

1. **Search moves server-side.** v1/v2 use client-side `filter()` over the
   loaded list — fine at low volume, useless past a few hundred items. v3
   introduces Postgres full-text search (`tsvector` + GIN index) across
   Content title/body/category, exposed via a search API.
2. **Versioning stores snapshots, not diffs.** Each save of a Content body
   writes an immutable version row. Simpler than diffing; storage is cheap.
   This is also the trigger to evaluate moving `body` from HTML string →
   Tiptap JSON (the v1 plan flagged this as the natural point).
3. **Engagement features are agent-first.** Discussions, notes, and bookmarks
   target the internal agent surface (`/dashboard/training`). Public `/learn`
   stays read-only/SEO — no public accounts (out of scope indefinitely).
4. **Analytics reads from existing rows.** Completion, attempts, and
   enrollment data already exist (v1/v2). The analytics dashboard is a
   read/aggregate layer — no new write-path instrumentation beyond a
   lightweight content-view event.

## New entities (Prisma)

**New**
- `TrainingComment { id, contentId (FK), userId, parentId? (self-FK for
  threads), body, createdAt, editedAt?, deletedAt? }`
- `TrainingNote { id, contentId, userId, body, anchor? (optional block/heading
  ref), updatedAt }` — private per-learner notes.
- `TrainingBookmark { id, contentId, userId, createdAt }` — unique
  (contentId, userId).
- `TrainingContentVersion { id, contentId, version Int, title, body, editorId,
  createdAt }` — immutable snapshot; unique (contentId, version).
- `TrainingContentLink { id, fromContentId, toContentId, createdAt }` —
  curated internal cross-references; unique (from, to).
- `TrainingContentView { id, contentId, userId?, viewedAt, dwellMs? }` —
  lightweight event for analytics (nullable user = public view).

**Modified**
- `TrainingContent`:
  - `searchVector Unsupported("tsvector")?` + GIN index (raw SQL migration;
    Prisma can't model tsvector natively — use `@@index` via raw migration).
  - `currentVersion Int @default(1)` — bumped on each body save.
  - Optionally migrate `body` to a `bodyJson Json?` column if the versioning
    work makes JSON the better store (decision gate in Phase 2).

## Phased build sequence

Each phase ends in a checkpoint commit (type-check + lint + tests pass).

### Phase 1 — Postgres full-text search
- Raw SQL migration: add `tsvector` column + GIN index + trigger (or generated
  column) keeping it in sync with title/body/category.
- Search API `/api/training/search?q=` (and admin variant) ranking by
  `ts_rank`; audience-scoped (agents see agent_only+both; public sees
  public_only+both).
- Replace client-side filter on `/dashboard/training` and admin Content list
  with debounced server search; keep category/type facets.
- `/learn` search box for public content.
- Tests: ranking, audience scoping, empty/malformed query.

### Phase 2 — Content versioning + history
- Decision gate: keep `body` as HTML vs. move to Tiptap JSON (`bodyJson`).
  Record the call in this plan before building.
- On every Content save, write a `TrainingContentVersion` snapshot and bump
  `currentVersion`.
- Admin "History" panel in the Content drawer: list versions, preview a
  version, restore (restoring writes a new version, never mutates history).
- Tests: snapshot-on-save, restore-as-new-version, version ordering.

### Phase 3 — Internal-link references (cross-content)
- Admin: "Related content" picker on the Content drawer → `TrainingContentLink`
  rows (curated, bidirectional display).
- Tiptap: internal-link mark/command that links to another Content by id
  (resolves to the correct surface — `/dashboard/training/...` for agents,
  `/learn/...` for public).
- Learner: "Related" rail driven by curated links first, then category
  fallback (v1's related rail was category-only).
- Tests: link CRUD, dangling-link handling on content archive/delete.

### Phase 4 — Notes + bookmarks (agent)
- Per-learner private notes on a Content item (autosave, Notion-style),
  optionally anchored to a heading/block.
- Bookmark toggle on Content cards + a "Saved" view on `/dashboard/training`.
- Tests: note autosave/debounce, bookmark uniqueness, saved-view query.

### Phase 5 — Discussions (agent)
- Threaded comments per Content (`parentId` self-FK), soft-delete, edit window.
- Admin moderation: delete any comment, lock a thread.
- Notification hook into existing toast/notification infra (optional, scoped).
- Tests: threading, soft-delete visibility, moderation, edit window.

### Phase 6 — Analytics dashboard (admin)
- Lightweight `TrainingContentView` event on content open (agent + public).
- New admin "Analytics" tab in the Training Hub:
  - Per-course: enrollment funnel, completion rate, avg time-to-complete,
    section drop-off, quiz pass rates (from v2 attempts).
  - Per-content: views, completions, avg dwell, bookmark/comment counts.
  - Date-range filter; CSV export.
- Aggregate queries only (no heavy ETL); index hot columns.
- Tests: aggregation correctness, date-range bounds, audience split.

### Phase 7 — Verify + E2E
- `npm run type-check`, `npm run lint`, `npx vitest run`.
- chrome-devtools E2E (desktop + 390×844 mobile):
  - Search returns ranked, audience-correct results on agent + public.
  - Edit content twice → view history → restore v1 → confirm new version.
  - Add related link → appears in learner related rail and resolves correctly.
  - Add note + bookmark → appears in Saved view.
  - Post threaded comment → reply → moderate.
  - Analytics tab renders real numbers; CSV export downloads.
- Vercel production verification.

## Reused utilities
- Tiptap editor + extension set (internal-link mark, versioned body).
- dnd-kit (none new expected; reuse if reordering related links).
- Existing notification/toast infra (discussions).
- Background jobs infra (optional: view-event rollups if aggregation gets hot).
- `adminFetch`, `useToast`, `ConfirmDialog`, Zod validation.

## Out of scope indefinitely
- Public (non-agent) accounts/login, SCORM/xAPI, AI content generation, live
  cohorts, native mobile app. Public `/learn` remains read-only + SEO.
