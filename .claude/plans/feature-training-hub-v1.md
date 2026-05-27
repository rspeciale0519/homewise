# Training Hub v1 — Credible Foundation

Replaces the prior `feature-training-hub-admin.md` (bulk-delete only) after a
full industry-research pass against Teachable, Thinkific, Kajabi, LearnWorlds,
Podia, Mighty Networks, Skool, TalentLMS, Docebo, 360Learning, Absorb,
LearnUpon, Coursera, Notion, Webflow, and KW University. Goal of this branch:
get the Training Hub from "table of items" to a credible, industry-standard
learning platform serving two audiences (internal agents + public buyers/
sellers) from one CMS. v2 (compliance teeth, certificates, quizzes) and v3
(versioning, discussions, notes, FTS, analytics) will be separate branches.

## Locked architectural decisions

1. **Build, don't buy.** Schema is already ~70% there; no off-the-shelf LMS
   serves agents and public/SEO content from shared rows.
2. **Block editor: Tiptap.** Slash-command UX is now table-stakes (Notion has
   trained users). Tiptap chosen over BlockNote for headroom.
3. **Three-level hierarchy: Course → Section → Content** (via existing
   `TrainingCourseItem` join, repointed to Section instead of Course). Every
   credible course platform has this layer; we're flat today.
4. **Two audiences, one Content table.** Keep `audience` flag on
   `TrainingContent`; separate visibility-audience from course-membership.
   A public article can still be a required item in an agent course — one row,
   two surfaces.
5. **Status lifecycle.** Replace `published: Boolean` with
   `status: draft | scheduled | published | archived` plus `publishedAt`.
6. **Promote `category` from string to entity.** Enables category landing
   pages (SEO) and controlled vocabulary.
7. **Course completion = % of lessons completed**, not time spent. Per-
   content-type criteria are v2 (default v1: manual "Mark complete").

## New + modified entities (Prisma)

**New**
- `TrainingSection { id, courseId, title, sortOrder, dripDays?, createdAt }`
  — drip enforcement is v2; column ships in v1 so v2 doesn't need a schema
  change.
- `TrainingCategory { id, name, slug @unique, description?, heroImageUrl?,
  sortOrder, createdAt }`.

**Modified**
- `TrainingContent`:
  - `status: TrainingContentStatus` enum (default `draft`).
  - `publishedAt: DateTime?` — backfilled to `updatedAt` for rows where
    `published=true`.
  - `categoryId: String?` — backfilled from the existing `category` string;
    `category` string column kept for one release for safety, dropped in v2.
  - `seoTitle: String?`, `seoDescription: String?`, `ogImageUrl: String?`,
    `readTimeMinutes: Int?`.
  - Lock `audience` to enum: `agent_only | public_only | both`. Existing
    values map: `agent → agent_only`, `public → public_only`, `both → both`.
- `TrainingCourse`:
  - `slug: String? @unique` (backfilled from name).
  - `audience: TrainingAudience` (default `agent_only` since current courses
    appear agent-internal — confirm during migration).
  - `dueDays: Int?` — v2 enforces, v1 ships the column.
  - `recurDays: Int?` — v2 enforces, v1 ships the column.
  - `passThreshold: Int @default(80)` — v2 (quizzes) uses it.
- `TrainingCourseItem`:
  - Add `sectionId: String` FK. **Migration** creates one default "Lessons"
    section per existing course and moves every item under it. The
    `courseId` column on `TrainingCourseItem` stays (denormalized for query
    speed) but `sectionId` becomes the authoritative parent.

**Enums (new)**
- `TrainingContentStatus { draft, scheduled, published, archived }`
- `TrainingAudience { agent_only, public_only, both }`

## Out of scope for v1 (explicitly deferred)

- Certificates (v2).
- Quizzes — schema allows `type: "quiz"` but no question/answer entities; v2.
- Per-content-type completion criteria (v2). v1 uses manual "Mark complete"
  for everything.
- Drip enforcement at runtime (v2). v1 ships the `dripDays` column only.
- Auto-enroll, recurring annual training, due-date enforcement (v2).
- Discussions, notes, bookmarks, internal-link references, content versioning
  (v3).
- Postgres full-text search (v3). v1 keeps existing client-side filtering.
- Analytics dashboard (v3).
- AI course generation, SCORM/xAPI, live cohorts, mobile native app, public
  accounts/login (out of scope indefinitely).

## Phased build sequence

Each phase ends in a checkpoint commit (type-check + lint + tests must pass).
All phases land on one branch; final squash-merge is one PR into `develop`.

### Phase 1 — Schema + migration
- Prisma migration: new enums, new `TrainingSection`, new `TrainingCategory`,
  field additions on `TrainingContent` + `TrainingCourse` +
  `TrainingCourseItem`.
- Backfill SQL (or Prisma seed script) for:
  - `TrainingContent.status` from `published`.
  - `TrainingContent.publishedAt` from `updatedAt` where `published=true`.
  - `TrainingCategory` rows from `DISTINCT TrainingContent.category`, with
    slugified slugs.
  - `TrainingContent.categoryId` FK from the old string value.
  - `TrainingCourseItem.sectionId` via one default "Lessons" Section per
    existing Course.
  - Lock `audience` values to enum.
- Update Prisma client types.
- Tests for the backfill helpers (pure functions, unit-tested).
- DO NOT drop the old `TrainingContent.category` string column yet — keep
  one release for safety; planned removal in v2.

### Phase 2 — Backend API updates
- `/api/admin/training/sections` — POST (create), reorder via PATCH on
  course; per-section PATCH/DELETE under `/sections/[id]`.
- `/api/admin/training/categories` — full CRUD.
- `/api/admin/training/[id]` — extend update schema with the new fields.
- `/api/admin/training/bulk-delete` — POST per-item partial-success
  (parallels documents bulk-delete pattern; Supabase Storage cleanup).
- `/api/admin/training/bulk-status` — POST batched publish / unpublish /
  archive.
- `/api/admin/training/bulk-category` — POST batched category reassignment.
- All new endpoints get tests (auth gate, Zod validation, partial-success).

### Phase 3 — Tiptap block editor
- Install `@tiptap/react` + extension set (StarterKit, Image, Link, Table,
  Placeholder, Underline, TaskList, Youtube, CharacterCount).
- New `BlockEditor` component (`src/components/admin/block-editor/`) with
  slash-command menu. Block types in v1: H1/H2/H3, paragraph, bulleted list,
  numbered list, task list, blockquote, callout, divider, image
  (Supabase upload), YouTube embed, file attachment, code, table.
- Replace the existing WYSIWYG in `TrainingContentDrawer`.
- Persist as HTML in `body` (Tiptap's `getHTML()`) — keeps schema string-
  typed; v3 versioning can move to JSON if needed.
- Component tests (Vitest) for block insertion, slash-command filtering,
  Supabase image upload.

### Phase 4 — Admin Content list: bulk select + bulk actions + category mgmt
- Convert the existing table rows to use the generalized
  `useDocumentSelection` hook (already abstract enough — re-exported as
  `useTrainingSelection` for readability).
- Add leftmost checkbox column + master "select all in filtered view"
  header checkbox (tri-state).
- Bulk action bar between tabs and table: shows N selected + buttons
  [Publish] [Unpublish] [Archive] [Change category] [Delete N…]. Strip
  height pinned to h-10 (lesson from documents work).
- `ConfirmDialog` for Delete with type-to-confirm.
- "Used in N courses" badge on Content edit drawer (links to course list).
- Category management UI: new tab "Categories" or modal on the Content
  list filter dropdown — CRUD with sort order drag.
- Per-bulk-op tests + chrome-devtools E2E spot-check.

### Phase 5 — Curriculum builder
- Replace existing `TrainingCourseDrawer` course-items UI with a drag-and-
  drop curriculum builder.
- Layout: left rail = searchable Content library filtered to the course's
  audience; right pane = vertical list of Sections, each expandable with its
  Content items.
- Drag-and-drop (reuse dnd-kit, same patterns as Document Library):
  - Reorder Sections.
  - Reorder Items within a Section.
  - Drag Item between Sections.
  - Drag from library onto a Section to add.
- Inline Section CRUD (rename, delete, add new).
- "+ Add from library" button per Section (modal picker fallback for
  keyboard / touch users — same dual-path lesson from documents bulk-move).
- Tests for the section reorder reducer + drag-end dispatcher.

### Phase 6 — Admin polish
- Autosave on the Content drawer block editor (debounced 1.5s) with
  "Saved Xs ago" indicator (Notion pattern).
- "Preview as agent" / "Preview as public" toggle in the admin shell —
  opens the corresponding learner surface in a new tab, scoped to the
  current Content.
- Status badge dropdown on Content rows (quick change without opening
  drawer).
- "Used in N courses" warning before archive.

### Phase 7 — Agent dashboard learner surface
- New "My Training" widget on `/dashboard` home: counts for required /
  due-soon / completed; CTA to /dashboard/training.
- Course player page (`/dashboard/training/courses/[id]`): section
  accordion, item list under each section, "Mark complete" button per
  item, "Next up" continue card at the bottom of each completed item.
- Course progress bar (% of items completed) at the top.
- Updates to `/dashboard/training` index to show Sections within Courses
  rather than flat item lists.

### Phase 8 — Public site (SEO foundation)
- `/learn` index — enhance existing page with category grid.
- `/learn/[category]` — new category landing page. Hero with category
  name + description + cover image; grid of public Content in that
  category; breadcrumbs.
- `/learn/[category]/[slug]` — enhance existing content page. Hero with
  category breadcrumb + title + read time + author; rendered block-editor
  body; auto-generated TOC from H2/H3 headings; related content rail
  (other public content in same category); JSON-LD (`Article` schema);
  OG meta tags; canonical URL.
- Sitemap regeneration to include all published public Content + category
  pages.
- Redirect old `/learn/[slug]` to `/learn/[category]/[slug]` (via
  `SlugHistory`).

### Phase 9 — Verify + E2E
- Full `npm run type-check`, `npm run lint`, `npx vitest run`.
- chrome-devtools E2E flows:
  - Admin: create category → create content with block editor → bulk
    publish 3 items → create course → drag items into 2 sections →
    publish course.
  - Agent learner: navigate to course → mark items complete across
    sections → see progress bar update → "Next up" continues.
  - Public: visit `/learn` → click category → click article → verify
    JSON-LD via View Source, TOC scrolls, related rail renders.
  - Mobile (390×844): all of the above with touch.
- Production preview verification via Vercel.

## Reused utilities

- `useDocumentSelection` — generic enough to power Training bulk select.
- `ConfirmDialog` — same destructive-action confirmation pattern.
- `BulkDragPreview`, `DndContextProvider` — drag-drop infrastructure.
- `adminFetch`, `useToast`, `toastWithUndo`, `usePersistedBoolean`.
- dnd-kit (already installed).

## Verification gates

- Type-check + lint must pass at every checkpoint.
- All new code paths get vitest tests (target: keep test count growing
  proportionally — currently 385).
- Vercel preview READY after each push.
- chrome-devtools E2E at end of Phase 9.

## File-size discipline

Source files cap at 450 LOC per project rules. Anticipated extractions:
- Tiptap setup + extensions list → own file.
- Curriculum builder split into Board + Section + Item + LibraryRail.
- Course player split into Player + SectionAccordion + ItemRow.
- Public content page kept thin via composition of shared UI pieces.

## Build vs buy — recorded rationale

We are explicitly building. The unique value of this Training Hub is that
public articles and agent training share one CMS, one URL space, and one
content row. No off-the-shelf LMS (Teachable, TalentLMS, Docebo, etc.)
serves that cleanly — they treat the public side as a "course catalog,"
which is SEO-mediocre and visually disconnected from the marketing site.
Buying would also mean throwing away the existing schema, paying per-agent
seat fees, and solving SSO into our portal. Build cost (per the phasing
above) is comparable to the integration cost of any buy option, and the
ongoing differentiation is real.
