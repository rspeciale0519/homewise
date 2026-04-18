# Training Hub Enhancement — Design Spec

## Context

The Training Hub exists as a basic content list for agents. After adding training content (videos, PDFs, articles), the admin and broker identified that the agent-facing Training Hub needs a modern, visual card-based UI with thumbnails, and that the existing "Tracks" concept should be renamed to "Courses" for clarity. The goal is to transform the Training Hub into a full-featured LMS experience that feels like YouTube/Udemy — visual-first, with prominent course banners and responsive thumbnail grids.

**Branch:** `training-hub-enhancement-001` (off `develop`)

---

## Terminology

| Old Term | New Term | Context |
|----------|----------|---------|
| Track | Course | An admin-curated ordered sequence of modules |
| Content / Content Item | Module | A single training item (video, document, article, quiz) |

---

## Data Model Changes

### Prisma Schema Renames

- `TrainingTrack` → `TrainingCourse` (table: `training_courses`)
- `TrainingTrackItem` → `TrainingCourseItem` (table: `training_course_items`)
- Foreign key `trackId` → `courseId` in `TrainingCourseItem` and `TrainingEnrollment`
- `TrainingEnrollment.trackId` → `TrainingEnrollment.courseId`

### New Fields

**TrainingContent:**
```prisma
thumbnailUrl String?   // URL to manually uploaded or auto-generated thumbnail
```

**TrainingCourse (formerly TrainingTrack):**
```prisma
thumbnailUrl String?   // Optional hero image for the course banner
```

### Storage

- **Bucket:** `training-thumbnails` (already created in Supabase, public access)
- **Path pattern:** `thumbnails/{uuid}-{sanitized-name}.webp`
- **Access:** Public URLs via `getPublicUrl()` (not signed URLs)

---

## Thumbnail Strategy

| Content Type | Primary Source | Fallback |
|---|---|---|
| Video | Admin-uploaded custom image | Auto-extract from YouTube: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg` |
| Document (PDF) | Server-generated PNG of first page (at upload time) | Generic PDF icon with document title |
| Article | Admin-uploaded custom image | Styled text preview showing first ~80 words of body |
| Quiz | Admin-uploaded custom image | Generic quiz icon with gradient background |

### PDF Thumbnail Generation

- Triggered after PDF file upload completes in the training content drawer
- Server-side: new endpoint `POST /api/admin/training/generate-thumbnail`
- Uses a Node.js PDF rendering library (e.g. `pdf-lib` + `sharp`, or `pdfjs-dist` with canvas) to render page 1 as WebP
- Generated image uploaded to `training-thumbnails` bucket
- `thumbnailUrl` field updated on the TrainingContent record

### YouTube Thumbnail Extraction

- Parse YouTube video ID from URL (supports `youtube.com/watch?v=`, `youtu.be/`, `youtube.com/embed/`)
- Construct URL: `https://img.youtube.com/vi/{VIDEO_ID}/hqdefault.jpg`
- Used directly in `<img>` tags — no storage needed (deterministic from URL)
- Only used when `thumbnailUrl` is null (admin override takes priority)

---

## Agent Training Hub Page (`/dashboard/training`)

### Layout Structure

1. **Page Header** — title, subtitle, stats bar (courses enrolled, modules completed, total modules)
2. **Your Courses** section — responsive grid of course banner cards
3. **All Modules** section — responsive grid of thumbnail cards with category/type filters

### Course Cards

- **Shape:** 16:9 aspect ratio thumbnails
- **Grid:** `repeat(auto-fill, minmax(260px, 1fr))` — ~4 per row at 1200px, responsive
- **Design:** Gradient background (or custom thumbnail), overlaid with:
  - Status badge (IN PROGRESS / NOT STARTED / COMPLETED / REQUIRED)
  - Course title
  - Module count + estimated duration
  - Progress bar with completion fraction
  - CTA text (Continue → / Start → / Review →)
- **Each course gets a distinct gradient color** based on status or admin choice
- **Click:** navigates to `/dashboard/training/courses/{id}`

### Module Cards

- **Shape:** 16:9 aspect ratio thumbnails (YouTube-style)
- **Grid:** `repeat(auto-fill, minmax(180px, 1fr))` — ~6 per row at 1200px, responsive
- **Layout:** Thumbnail on top (no card border), title + metadata below
- **Thumbnail variations by type:**
  - Video: dark gradient or YouTube thumbnail + red play button overlay + duration badge
  - PDF: auto-generated first-page preview or generic PDF doc preview
  - Article: text preview with gradient fade, or custom thumbnail
  - Quiz: gradient with quiz icon
- **Metadata below thumbnail:** title, category, duration, completion checkmark
- **Click:** navigates to `/dashboard/training/{id}`

### Filters

- Category dropdown (All Categories + existing categories)
- Type dropdown (All Types + video/document/article/quiz)
- Applied client-side to the All Modules grid

---

## Module Detail Page (`/dashboard/training/{id}`)

### Video Modules

- Full-width embedded YouTube player (responsive 16:9 iframe) at top
- Below: title, description, category badge, duration
- "Mark as Complete" button
- If part of a course: "Up Next in [Course Name]" section showing next module

### Document (PDF) Modules

- Embedded PDF viewer (iframe with signed Supabase URL)
- Download button
- Title, description, metadata
- "Mark as Complete" button

### Article Modules

- Rendered article body (sanitized HTML with prose styling)
- Title, description, metadata at top
- "Mark as Complete" button

---

## Course Detail Page (`/dashboard/training/courses/{id}`) — NEW

- Course banner header: title, description, progress bar, stats
- Ordered list of all modules as small horizontal cards with thumbnails
- Current/next module highlighted (indigo border or similar)
- Completed modules show checkmark, struck-through title
- Click any module → navigates to its detail page

---

## Admin Changes

### Sidebar

- Rename "Training" label → "Training Hub" (URL remains `/admin/training`)

### Training Content Drawer

- **New field: Thumbnail** (at top of form)
  - Drag-drop upload zone (JPEG, PNG, WebP, max 2MB)
  - Preview of current/uploaded thumbnail
  - For video type with YouTube URL: show auto-detected YouTube thumbnail with hint "Auto-detected from YouTube — upload custom to override"
  - For document type after PDF upload: show auto-generated first-page thumbnail with hint "Auto-generated from PDF — upload custom to override"
- Upload goes to `training-thumbnails` bucket via new thumbnail upload endpoint

### Tabs & Labels Rename

- "Tracks" tab → "Courses" tab
- "Create Track" button → "Create Course"
- TrainingTrackDrawer → TrainingCourseDrawer
- All internal references updated

### Training Course Drawer (formerly Track Drawer)

- Same functionality as current TrainingTrackDrawer
- Labels updated: Track → Course throughout
- Optional: add thumbnail upload for course banner image

---

## Files to Modify

### Prisma & DB
- `prisma/schema.prisma` — rename models, add `thumbnailUrl` fields
- New migration

### API Routes
- `src/app/api/admin/training/route.ts` — include `thumbnailUrl` in responses
- `src/app/api/admin/training/[id]/route.ts` — handle `thumbnailUrl` updates
- `src/app/api/admin/training/tracks/route.ts` → rename to courses, update logic
- `src/app/api/admin/training/tracks/[id]/route.ts` → rename
- NEW: `src/app/api/admin/training/thumbnail/route.ts` — thumbnail upload
- NEW: `src/app/api/admin/training/generate-thumbnail/route.ts` — PDF thumbnail generation

### Admin Components
- `src/app/admin/training/page.tsx` — rename categories display
- `src/app/admin/training/training-admin-view.tsx` — rename Track→Course in tabs, labels
- `src/app/admin/training/types.ts` — rename TrackData→CourseData
- `src/components/admin/training-content-drawer.tsx` — add thumbnail upload field
- `src/components/admin/training-track-drawer.tsx` → rename to `training-course-drawer.tsx`
- `src/components/admin/training-progress-view.tsx` — update any Track references
- Admin sidebar link label: "Training" → "Training Hub"

### Agent Dashboard
- `src/app/dashboard/training/page.tsx` — complete rewrite with new card UI
- `src/app/dashboard/training/[id]/page.tsx` — enhance detail page
- NEW: `src/app/dashboard/training/courses/[id]/page.tsx` — course detail page
- `src/components/dashboard/sidebar.tsx` — already has Training link (no change needed)

### Shared/Utilities
- NEW: `src/lib/training/youtube.ts` — YouTube ID extraction + thumbnail URL helper
- NEW: `src/lib/training/thumbnail.ts` — thumbnail URL resolution logic (manual > auto-generated > fallback)

---

## Verification Plan

1. **Type check:** `npx tsc --noEmit` passes
2. **Build:** `npm run build` succeeds
3. **Prisma migration:** `npx prisma migrate dev` applies cleanly
4. **Admin flow:** Create a video module with YouTube URL → verify auto-thumbnail appears → upload custom override → save → verify in admin list
5. **Admin flow:** Create a PDF module → upload PDF → verify auto-generated thumbnail appears → save
6. **Admin flow:** Create a course with multiple modules → verify Course tab shows it
7. **Agent Training Hub:** Verify courses appear as banner cards, modules as thumbnail cards, responsive grid works
8. **Module detail:** Click video module → YouTube player embedded and plays → Mark Complete works
9. **Course detail:** Click course card → course page shows ordered modules with progress
10. **Browser testing:** Use Playwright MCP to test and check console errors
