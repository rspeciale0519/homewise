# Training Hub Admin Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Use the frontend-design skill for all UI component implementation to ensure visual quality and consistency with the existing site design.

**Goal:** Transform the Training Hub from a basic link manager into a mini-LMS with file uploads, rich text lessons, inline content viewing, drag-and-drop track building, agent progress tracking, and email reminders.

**Architecture:** Three-tab admin UI (Content, Tracks, Progress) backed by Prisma models with two new fields (`body`, `fileKey` on TrainingContent; `reminderDays`, `reminderRepeat` on TrainingTrack). File uploads via Supabase Storage. Inline consumption on agent dashboard via YouTube embeds and in-browser PDF viewer. Email reminders via Inngest cron + Resend.

**Tech Stack:** Next.js App Router, Prisma, Supabase Storage (`@supabase/supabase-js` — already installed), Tiptap editor (already installed, reusable `TiptapEditor` component at `src/components/admin/tiptap-editor.tsx`), `@dnd-kit/core` + `@dnd-kit/sortable` (new), Inngest (already installed), Resend email (already installed at `src/lib/email/index.ts`), Radix Dialog (already installed), Sonner toasts (already installed).

**Security:** All Tiptap HTML output rendered via `dangerouslySetInnerHTML` MUST be sanitized with DOMPurify (`isomorphic-dompurify`) before rendering. Install as a dependency in Task 1.

**Design doc:** `docs/plans/2026-03-08-training-hub-redesign-design.md`

**UI Design:** All UI components must use the frontend-design skill to ensure visual consistency with the existing site. Key brand patterns: navy-700 headings, slate-500 body text, white cards with `border-slate-200`, `rounded-xl` cards, `font-serif` for page titles, crimson-600 for primary actions.

---

## Task 1: Install Dependencies & Schema Migration

**Files:**
- Modify: `package.json` (add @dnd-kit, isomorphic-dompurify)
- Modify: `prisma/schema.prisma` (add fields to TrainingContent and TrainingTrack)

**Step 1: Install packages**

Run:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities isomorphic-dompurify --legacy-peer-deps
npm install -D @types/dompurify --legacy-peer-deps
```

**Step 2: Add schema fields**

In `prisma/schema.prisma`, add to `TrainingContent` model (after `url` field):

```prisma
body    String?   // Rich text HTML from Tiptap editor
fileKey String?   // Supabase Storage path for uploaded files
```

Add to `TrainingTrack` model (after `autoEnroll` field):

```prisma
reminderDays   Int?   // Days after enrollment before first reminder
reminderRepeat Int?   // Days between repeat reminders
```

**Step 3: Push schema changes**

Run:
```bash
npx prisma db push
```

**Step 4: Generate Prisma client**

Run:
```bash
npx prisma generate
```

**Step 5: Verify type-check passes**

Run:
```bash
npm run type-check
```

Expected: PASS (new optional fields don't break existing code)

**Step 6: Commit**

```bash
git add package.json package-lock.json prisma/schema.prisma
git commit -m "feat(training): add dnd-kit, dompurify deps, body/fileKey/reminder schema fields"
```

---

## Task 2: Supabase Storage Upload API Route

**Files:**
- Create: `src/app/api/admin/training/upload/route.ts`

**Step 1: Create the upload route**

This route generates a Supabase Storage signed upload URL. The client uploads directly to Supabase.

```typescript
// POST /api/admin/training/upload
// Body: { filename: string, contentType: string }
// Returns: { uploadUrl: string, fileKey: string }
```

Implementation details:
- Import `createAdminClient` from `@/lib/supabase/admin`
- Validate with Zod: `filename` (string, min 1), `contentType` (string, min 1)
- Validate file extension against allowlist: `.pdf`, `.xlsx`, `.xls`, `.docx`, `.doc`, `.png`, `.jpg`, `.jpeg`
- Validate content type against MIME allowlist
- Generate unique `fileKey`: `training/${cuid()}-${sanitizedFilename}`
- Use `supabase.storage.from("training-files").createSignedUploadUrl(fileKey)` to get upload URL
- Return `{ uploadUrl, fileKey }`

Reference existing admin API route patterns in:
- `src/app/api/admin/training/route.ts` for structure
- `src/lib/supabase/admin.ts` for the admin client

**Step 2: Verify type-check passes**

Run: `npm run type-check`

**Step 3: Commit**

```bash
git add src/app/api/admin/training/upload/route.ts
git commit -m "feat(training): add Supabase Storage signed upload API route"
```

---

## Task 3: Content CRUD API Routes (PATCH + DELETE)

**Files:**
- Create: `src/app/api/admin/training/[id]/route.ts`
- Modify: `src/app/api/admin/training/route.ts`

**Step 1: Create the [id] route with PATCH and DELETE**

PATCH handler:
- Zod schema: all fields optional — `title`, `description`, `body`, `category`, `audience`, `type`, `url`, `fileKey`, `duration`, `tags` (string[]), `published` (boolean), `sortOrder`
- Update via `prisma.trainingContent.update({ where: { id }, data: parsed.data })`
- Return updated record

DELETE handler:
- Fetch record first to check for `fileKey`
- If `fileKey` exists, delete from Supabase Storage via `createAdminClient`
- Delete from DB via `prisma.trainingContent.delete({ where: { id } })`
- Return `{ success: true }`

Reference: `src/app/api/admin/training/route.ts` for the existing POST/GET patterns.

**Step 2: Update the existing GET route**

In `src/app/api/admin/training/route.ts`, modify GET to also return unpublished content when called from admin. Add a `?admin=true` query param that removes the `published: true` filter.

**Step 3: Update the existing POST route**

In `src/app/api/admin/training/route.ts`, add `body` and `fileKey` to the Zod schema and Prisma create call.

**Step 4: Verify type-check passes**

Run: `npm run type-check`

**Step 5: Commit**

```bash
git add src/app/api/admin/training/[id]/route.ts src/app/api/admin/training/route.ts
git commit -m "feat(training): add content PATCH/DELETE routes, update POST with body/fileKey"
```

---

## Task 4: Track CRUD API Routes (PATCH + DELETE)

**Files:**
- Create: `src/app/api/admin/training/tracks/[id]/route.ts`
- Modify: `src/app/api/admin/training/tracks/route.ts`

**Step 1: Create tracks [id] route with PATCH and DELETE**

PATCH handler:
- Zod schema: `name?`, `description?`, `required?`, `autoEnroll?`, `reminderDays?` (number | null), `reminderRepeat?` (number | null), `contentIds?` (string[] — the ordered list of content IDs)
- If `contentIds` is provided: delete all existing `TrainingTrackItem` rows for this track, then create new ones with correct `sortOrder`
- Use `prisma.$transaction` to wrap delete + create
- Return updated track with items

DELETE handler:
- Delete via `prisma.trainingTrack.delete({ where: { id } })` (cascade handles items + enrollments)
- Return `{ success: true }`

**Step 2: Update existing POST route**

Add `reminderDays` and `reminderRepeat` to the Zod schema and create call in `src/app/api/admin/training/tracks/route.ts`.

**Step 3: Verify type-check passes**

Run: `npm run type-check`

**Step 4: Commit**

```bash
git add src/app/api/admin/training/tracks/[id]/route.ts src/app/api/admin/training/tracks/route.ts
git commit -m "feat(training): add track PATCH/DELETE routes, update POST with reminder fields"
```

---

## Task 5: Progress API Route

**Files:**
- Create: `src/app/api/admin/training/progress/route.ts`
- Create: `src/app/api/dashboard/training/[id]/complete/route.ts`

**Step 1: Create admin progress route**

GET `/api/admin/training/progress` returns:
- Summary stats: total published content, total enrollments, avg completion rate, overdue count
- Per-agent breakdown: agent name, tracks completed/total, content completed/total, last activity date

Query approach:
- Fetch all `UserProfile` where role = "agent"
- Fetch all `TrainingProgress` grouped by userId
- Fetch all `TrainingEnrollment` grouped by userId
- Count total published `TrainingContent`
- Compute completion percentages
- Return structured JSON

**Step 2: Create agent completion route**

POST `/api/dashboard/training/[id]/complete`:
- Get current user from Supabase auth (use `createClient` from `@/lib/supabase/server`)
- Upsert `TrainingProgress` with `completed: true`, `completedAt: new Date()`
- Check if all items in any enrolled tracks are now complete → if so, set `TrainingEnrollment.completedAt`
- Return `{ success: true }`

**Step 3: Verify type-check passes**

Run: `npm run type-check`

**Step 4: Commit**

```bash
git add src/app/api/admin/training/progress/route.ts src/app/api/dashboard/training/[id]/complete/route.ts
git commit -m "feat(training): add progress API and agent completion endpoint"
```

---

## Task 6: Admin Content Tab — Slide-Out Drawer

> **UI Design:** Use the frontend-design skill for this task. Match existing admin patterns from `seo-content-view.tsx` and `broadcast-list-view.tsx`.

**Files:**
- Create: `src/components/admin/training-content-drawer.tsx`
- Modify: `src/app/admin/training/training-admin-view.tsx`
- Modify: `src/app/admin/training/page.tsx`

**Step 1: Create TrainingContentDrawer component**

A Radix Dialog-based slide-out drawer (right side). Reference the existing Radix Dialog pattern from `src/components/layout/mobile-nav.tsx` for overlay + content animation classes (`data-[state=open]:animate-in`, `slide-in-from-right`, etc.).

Props:
```typescript
interface TrainingContentDrawerProps {
  open: boolean;
  onClose: () => void;
  item: TrainingItem | null; // null = creating new
  categories: string[];
  onSaved: () => void;
}
```

Features:
- `Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}`
- `Dialog.Overlay` with backdrop blur
- `Dialog.Content` slides in from right: `fixed top-0 right-0 bottom-0 w-full max-w-lg`
- `Dialog.Title`: "New Training Content" or "Edit: {title}"
- Scrollable form body with all fields:
  1. Title (text input, required)
  2. Category (select dropdown)
  3. Type (select: video, document, article, quiz)
  4. Audience (select: Agent Only, Public, Both)
  5. Body (`<TiptapEditor>` from `src/components/admin/tiptap-editor.tsx`)
  6. Video URL (text input, conditional on type=video) with YouTube embed preview
  7. File Upload (drag-and-drop zone, conditional on type=document|article) — calls `/api/admin/training/upload`, then uploads directly to Supabase
  8. Duration (number input, minutes)
  9. Tags (text input, comma-separated)
  10. Published (toggle switch)
- Footer: Save + Cancel + Delete (with `ConfirmDialog` from `src/components/admin/confirm-dialog.tsx`)
- On save: POST (new) or PATCH (existing) via `adminFetch`
- Toast notifications via `useToast`

Keep under 450 lines. Extract the file upload zone into a separate `TrainingFileUpload` component if needed.

**Step 2: Rewrite training-admin-view.tsx Content tab**

Replace the inline form and basic table with:
- Search bar (filters client-side by title/tags)
- Category filter dropdown
- Audience filter dropdown
- Clickable table rows → open drawer with `setEditing(item)`
- "+ Add Content" button → open drawer with `setEditing(null)`
- Publish/draft toggle directly in table (calls PATCH)

Switch to client-side fetching pattern (like `seo-content-view.tsx`) using `adminFetch` + `useCallback` + `useEffect`. The page.tsx passes initial data, but the client component refetches after mutations via `router.refresh()` or direct fetch.

**Step 3: Update page.tsx if needed**

Adjust initial data loading to include `body` and `fileKey` fields.

**Step 4: Verify type-check and lint pass**

Run: `npm run type-check && npm run lint`

**Step 5: Commit**

```bash
git add src/components/admin/training-content-drawer.tsx src/app/admin/training/training-admin-view.tsx src/app/admin/training/page.tsx
git commit -m "feat(training): add slide-out content drawer with Tiptap, file upload, and inline editing"
```

---

## Task 7: Admin Tracks Tab — Drag-and-Drop Builder

> **UI Design:** Use the frontend-design skill for this task.

**Files:**
- Create: `src/components/admin/training-track-drawer.tsx`
- Modify: `src/app/admin/training/training-admin-view.tsx` (tracks tab section)

**Step 1: Create TrainingTrackDrawer component**

Radix Dialog slide-out drawer (same animation shell as content drawer).

Props:
```typescript
interface TrainingTrackDrawerProps {
  open: boolean;
  onClose: () => void;
  track: TrackData | null; // null = creating new
  allContent: TrainingItem[]; // for the content picker
  onSaved: () => void;
}
```

Features:
- Name, Description, Required toggle, Auto-enroll toggle
- Reminder Days + Reminder Repeat (shown only when Required is on)
- Drag-and-drop sortable list using `@dnd-kit/sortable`:
  - `SortableContext` with `verticalListSortingStrategy`
  - Each item: grip handle icon, content title, type badge, X remove button
  - `DndContext` with `closestCenter` collision detection
  - `onDragEnd` handler reorders the local state array using `arrayMove` from `@dnd-kit/sortable`
- "Add Content" button at bottom → dropdown listing all published content not already in the track. Searchable text filter.
- Footer: Save + Cancel + Delete (with ConfirmDialog)
- On save: POST (new) or PATCH (existing) — sends `contentIds` array in current order

Keep under 450 lines.

**Step 2: Update tracks tab in training-admin-view.tsx**

- Track cards are clickable → open drawer
- "Create Track" button → open drawer with null track
- After save/delete, refetch tracks

**Step 3: Verify type-check and lint pass**

Run: `npm run type-check && npm run lint`

**Step 4: Commit**

```bash
git add src/components/admin/training-track-drawer.tsx src/app/admin/training/training-admin-view.tsx
git commit -m "feat(training): add drag-and-drop track builder drawer"
```

---

## Task 8: Admin Progress Tab

> **UI Design:** Use the frontend-design skill. Reference `team-performance-view.tsx` for card/table patterns.

**Files:**
- Create: `src/components/admin/training-progress-view.tsx`
- Modify: `src/app/admin/training/training-admin-view.tsx` (add Progress tab)

**Step 1: Create TrainingProgressView component**

Client component that fetches from `/api/admin/training/progress`.

Layout:
- Summary stats bar (4 cards matching `TotalCard` pattern from team-performance):
  - Total published content items
  - Total track enrollments
  - Average completion rate (%)
  - Overdue agents count
- Agent progress table:
  - Agent avatar + name (use same `AgentAvatar` pattern)
  - Tracks completed / total
  - Content completed / total
  - Average completion %
  - Last activity date
- Click agent row → inline expand showing per-track breakdown with individual item completion checkmarks
- Loading spinner while fetching (same pattern as other admin views)

**Step 2: Wire into training-admin-view.tsx**

Add "Progress" as third tab. When active, render `<TrainingProgressView />`.

**Step 3: Verify type-check and lint pass**

Run: `npm run type-check && npm run lint`

**Step 4: Commit**

```bash
git add src/components/admin/training-progress-view.tsx src/app/admin/training/training-admin-view.tsx
git commit -m "feat(training): add agent progress dashboard tab"
```

---

## Task 9: Agent Lesson Detail Page

> **UI Design:** Use the frontend-design skill. This is the agent-facing lesson consumption page — it should feel like a clean, focused reading experience.

**Files:**
- Create: `src/app/dashboard/training/[id]/page.tsx`
- Create: `src/app/dashboard/training/[id]/mark-complete-button.tsx` (client component)
- Modify: `src/app/dashboard/training/page.tsx` (make items clickable, add completion badges)

**Step 1: Create lesson detail page**

Server component that loads a single `TrainingContent` item by ID.

Layout:
- Back link to `/dashboard/training`
- Title (H1)
- Body rendered as sanitized HTML:
  ```typescript
  import DOMPurify from "isomorphic-dompurify";
  const cleanHtml = DOMPurify.sanitize(item.body ?? "");
  // render with dangerouslySetInnerHTML={{ __html: cleanHtml }}
  // wrap in prose prose-sm classes for Tailwind Typography styling
  ```
- If type = video and url exists: YouTube iframe embed (extract video ID from URL, render responsive 16:9 iframe)
- If fileKey exists: in-browser PDF viewer (`<iframe src={signedUrl} />`) with download button. For non-PDF files (XLSX, DOCX), show download button only.
- `<MarkCompleteButton>` at bottom (client component)

Get current user via `createClient` from `@/lib/supabase/server` to check progress.
Generate signed URL for files via `createAdminClient` from `@/lib/supabase/admin`.

**Step 2: Create MarkCompleteButton client component**

- Shows "Mark Complete" button if not yet completed
- Shows "Completed" badge with checkmark if already completed
- Calls POST `/api/dashboard/training/[id]/complete` on click
- Toast on success

**Step 3: Update agent training hub page**

Make content cards in `src/app/dashboard/training/page.tsx` clickable — wrap in `<Link href={/dashboard/training/${item.id}}>`.
Add completion badges to track cards (query `TrainingProgress` for current user).
Show completed checkmark on individual content items that are done.

**Step 4: Verify type-check and lint pass**

Run: `npm run type-check && npm run lint`

**Step 5: Commit**

```bash
git add src/app/dashboard/training/[id]/page.tsx src/app/dashboard/training/[id]/mark-complete-button.tsx src/app/dashboard/training/page.tsx
git commit -m "feat(training): add agent lesson detail page with inline content viewing and completion"
```

---

## Task 10: Email Reminder Inngest Function

**Files:**
- Create: `src/inngest/functions/training-reminders.ts`
- Modify: `src/inngest/functions/index.ts` (register new function)

**Step 1: Create the reminder function**

Pattern: follow `src/inngest/functions/drip-campaign.ts` structure.

```typescript
export const trainingReminders = inngest.createFunction(
  { id: "training-reminders", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Daily at 9am
  async ({ step }) => {
    // Step 1: Find overdue enrollments
    // Query TrainingEnrollment where:
    //   - completedAt IS NULL
    //   - track.required = true
    //   - track.reminderDays IS NOT NULL
    //   - createdAt + reminderDays < now
    //
    // Step 2: For each overdue enrollment, calculate if reminder is due:
    //   - daysOverdue = (now - createdAt) - reminderDays
    //   - If reminderRepeat is set: send if daysOverdue % reminderRepeat === 0
    //   - If reminderRepeat is null: only send once (when daysOverdue === 0)
    //
    // Step 3: Fetch user email from UserProfile
    //
    // Step 4: Fetch incomplete items for this track
    //
    // Step 5: Send email via sendEmail + buildEmailHtml
    //   - Subject: "Training Reminder: {trackName}"
    //   - Body: list of incomplete items with links to /dashboard/training/[id]
    //   - Use buildEmailHtml from src/lib/email/index.ts
  }
);
```

**Step 2: Register in index.ts**

Import and add `trainingReminders` to `ALL_INNGEST_FUNCTIONS` array.

**Step 3: Verify type-check passes**

Run: `npm run type-check`

**Step 4: Commit**

```bash
git add src/inngest/functions/training-reminders.ts src/inngest/functions/index.ts
git commit -m "feat(training): add daily training reminder Inngest function"
```

---

## Task 11: Supabase Storage Bucket Setup

**Files:**
- Create: `scripts/setup-training-bucket.ts` (one-time setup script)

**Step 1: Create bucket setup script**

```typescript
// Creates the "training-files" bucket in Supabase Storage if it doesn't exist
// Run once: npx tsx scripts/setup-training-bucket.ts
```

- Uses `createAdminClient` to create a private bucket `training-files`
- Sets size limit per file: 25MB
- Allowed MIME types: application/pdf, spreadsheet types, word doc types, image/png, image/jpeg

**Step 2: Run the script**

Run: `npx tsx scripts/setup-training-bucket.ts`

**Step 3: Commit**

```bash
git add scripts/setup-training-bucket.ts
git commit -m "feat(training): add Supabase Storage bucket setup script"
```

---

## Task 12: Final Verification & Build

**Step 1: Run type-check**

Run: `npm run type-check`
Expected: PASS with zero errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: PASS with zero errors (fix any issues)

**Step 3: Run build**

Run: `npm run build`
Expected: PASS — all pages compile

**Step 4: Visual verification**

Start dev server and verify in browser:
- Admin Training Hub: all 3 tabs work
- Content drawer: create, edit, delete, upload file, add body text with Tiptap
- Track drawer: create, edit, rename, delete, drag-and-drop reorder, add/remove content
- Progress tab: shows agent completion data with stats cards
- Agent dashboard: click content → lesson detail page
- Lesson page: YouTube embed renders, PDF viewer works, Mark Complete button works
- Completion badges appear on finished tracks

**Step 5: Final commit if any fixes needed**

---

## Task Dependencies

```
Task 1 (schema + deps)
  ├── Task 2 (upload route)
  ├── Task 3 (content CRUD routes)
  ├── Task 4 (track CRUD routes)
  └── Task 5 (progress routes)
        ├── Task 6 (content drawer UI) — depends on Tasks 2, 3
        ├── Task 7 (track drawer UI) — depends on Task 4
        ├── Task 8 (progress tab UI) — depends on Task 5
        ├── Task 9 (agent lesson page) — depends on Tasks 3, 5
        ├── Task 10 (email reminders) — depends on Task 4
        └── Task 11 (bucket setup) — depends on Task 2
              └── Task 12 (final verification) — depends on all above
```

**Parallelizable groups:**
- Tasks 2-5 can run in parallel (all API routes, no file conflicts)
- Tasks 6-11 can run in parallel (different files, but depend on Tasks 1-5)
- Task 12 runs last

---

## Key Reference Files

| Purpose | File |
|---|---|
| Tiptap editor component | `src/components/admin/tiptap-editor.tsx` |
| Confirm dialog | `src/components/admin/confirm-dialog.tsx` |
| Admin toast | `src/components/admin/admin-toast.tsx` |
| Admin fetch helper | `src/lib/admin-fetch.ts` |
| Supabase admin client | `src/lib/supabase/admin.ts` |
| Admin auth guard | `src/lib/admin.ts` |
| Email sending | `src/lib/email/index.ts` |
| Inngest client | `src/inngest/client.ts` |
| Inngest function registry | `src/inngest/functions/index.ts` |
| Drip campaign (Inngest pattern) | `src/inngest/functions/drip-campaign.ts` |
| SEO content view (Tiptap + edit pattern) | `src/app/admin/seo-content/seo-content-view.tsx` |
| Broadcast view (Tiptap + toast pattern) | `src/app/admin/broadcasts/broadcast-list-view.tsx` |
| Mobile nav (Radix Dialog drawer pattern) | `src/components/layout/mobile-nav.tsx` |
| Team performance (stats cards pattern) | `src/app/admin/team-performance/team-performance-view.tsx` |
| Prisma schema | `prisma/schema.prisma` |
| Design document | `docs/plans/2026-03-08-training-hub-redesign-design.md` |
