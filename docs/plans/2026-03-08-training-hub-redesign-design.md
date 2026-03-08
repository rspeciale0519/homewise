# Training Hub Admin Redesign — Design Document

**Date:** 2026-03-08
**Status:** Approved

## Problem

The current Training Hub admin UI is a basic CRUD form. Admins can only add content via title + URL, cannot edit after creation, cannot upload files, and have no visibility into agent progress. Content items are external links — agents leave the platform to consume training. There's no lesson context, no inline viewing, and no completion tracking UI.

## Goals

1. Transform the admin experience from "data entry form" into a content management tool
2. Enable file uploads (PDFs, spreadsheets, docs) via Supabase Storage
3. Add rich text lesson bodies using the existing Tiptap editor
4. Provide inline content consumption (embedded YouTube, in-browser PDF viewer)
5. Give admins visibility into agent progress and completion rates
6. Support drag-and-drop track building
7. Auto-remind agents who are behind on required training
8. Show completion badges when agents finish tracks

## Architecture

### Storage Model

| Content Type | Storage | Access |
|---|---|---|
| Videos | YouTube (unlisted) | Admin pastes embed URL, rendered as iframe |
| PDFs, XLSX, DOCX, images | Supabase Storage (`training-files` bucket) | Uploaded via admin drawer, served via signed URLs |
| Articles / written content | Tiptap body field (HTML in database) | Rendered directly as formatted HTML |

### Schema Changes

Two new fields on `TrainingContent`:

```prisma
model TrainingContent {
  // ... existing fields ...
  body    String?   // Rich text HTML from Tiptap editor
  fileKey String?   // Supabase Storage path (e.g., "training/abc123.pdf")
}
```

New field on `TrainingTrack` for email reminders:

```prisma
model TrainingTrack {
  // ... existing fields ...
  reminderDays    Int?   // Days after enrollment before first reminder (null = no reminders)
  reminderRepeat  Int?   // Days between repeat reminders (null = single reminder)
}
```

No changes to `TrainingTrackItem`, `TrainingEnrollment`, or `TrainingProgress`.

## Admin UI — Three Tabs

### Tab 1: Content (upgraded)

**List view:**
- Search bar (filters by title, tags)
- Category filter dropdown
- Audience filter dropdown
- Publish/draft toggle per row (clickable status badge)
- Click any row → opens Content Drawer

**Content Drawer (slide-out, right side):**

Used for both "Add Content" and "Edit Content." Fields:

1. Title — text input (required)
2. Category — select (onboarding, contracts, compliance, platform, market_knowledge)
3. Type — select (video, document, article, quiz)
4. Audience — select (Agent Only, Public, Both)
5. Body — `<TiptapEditor>` component (existing, reused). Admin writes lesson context, instructions, key takeaways.
6. Video URL — text input, shown only when type = "video". YouTube embed preview below input.
7. File Upload — drag-and-drop zone, shown only when type = "document" or "article". Accepts PDF (25MB), XLSX (10MB), DOCX (10MB), PNG/JPG (5MB). Shows file name + size after upload.
8. Duration — number input (minutes)
9. Tags — comma-separated text input
10. Published — toggle switch

Footer: Save + Cancel + Delete (with confirm dialog for existing content).

### Tab 2: Tracks (upgraded)

**Track list view:**
- Track cards with name, description, badges (Required, Auto-enroll), enrollment count
- Click card → opens Track Drawer
- "Create Track" button

**Track Drawer:**

1. Name — text input
2. Description — textarea
3. Required — toggle
4. Auto-enroll — toggle
5. Reminder interval — number input (days after enrollment). Shown only when Required is on.
6. Reminder repeat — number input (days between repeats). Shown only when reminder interval is set.
7. Content items — drag-and-drop sortable list (@dnd-kit). Grip handle, title, type icon, X to remove.
8. Add Content — button opens searchable content picker (all published content not already in track).

Footer: Save + Cancel + Delete (with confirm dialog).

**Admin actions on tracks:**

| Action | How |
|---|---|
| Add new track | "Create Track" button → empty drawer |
| Edit / rename | Click track card → drawer with current values |
| Delete | Delete button in drawer footer (confirm dialog) |
| Reorder content | Drag-and-drop in drawer |
| Add content to track | "Add Content" picker in drawer |
| Remove content from track | X button per item |

### Tab 3: Progress (new)

**Summary stats bar (4 cards):**
- Total published content items
- Total track enrollments
- Average completion rate (all agents)
- Agents with overdue required tracks

**Agent progress table:**

| Agent | Tracks Completed | Content Completed | Avg Completion | Last Activity |
|---|---|---|---|---|
| Jane Smith | 2/3 | 12/18 | 67% | 2 days ago |

Click agent row → expands inline showing per-track breakdown with individual content item completion status.

## Agent-Facing Experience

### Lesson Detail Page (`/dashboard/training/[id]`)

When an agent clicks a training item:

- **Videos:** Tiptap body rendered as HTML + YouTube iframe embedded inline
- **Documents/PDFs:** Tiptap body rendered + in-browser PDF viewer (`<iframe>` with Supabase signed URL) + download button
- **Articles:** Tiptap body rendered as formatted HTML (may have no external resource)
- **"Mark Complete" button** at the bottom. Creates/updates `TrainingProgress` record.

### Completion Badges

When an agent completes all items in a track:
- `TrainingEnrollment.completedAt` is set automatically
- Track card on dashboard shows a checkmark/completed visual state
- Completed tracks sort to the bottom of the Learning Tracks section

### Progress Tracking

- Individual content: `TrainingProgress` record created when agent clicks "Mark Complete"
- Track-level: `TrainingEnrollment.completedAt` set when all track items have completed progress records
- Both feed the admin Progress tab

## Email Reminders

- Triggered for **required tracks only** when `reminderDays` is set
- First reminder: `reminderDays` days after `TrainingEnrollment.createdAt` if `completedAt` is null
- Repeat reminders: every `reminderRepeat` days after the first
- Uses existing email infrastructure (same as broadcasts)
- Reminder content: track name, list of incomplete items, link to training dashboard

## File Upload Flow

1. Admin drags file into upload zone (or clicks to browse)
2. Client validates: file type (PDF, XLSX, DOCX, PNG, JPG) + size limits
3. Client calls `/api/admin/training/upload` with filename + content type
4. Server generates Supabase Storage signed upload URL, returns it
5. Client uploads directly to Supabase Storage
6. On success, `fileKey` saved on `TrainingContent` record
7. Agent-facing pages generate fresh signed URLs from `fileKey` on each request

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/admin/training` | GET | List content (existing) |
| `/api/admin/training` | POST | Create content (existing, add body/fileKey) |
| `/api/admin/training/[id]` | PATCH | Update existing content |
| `/api/admin/training/[id]` | DELETE | Delete content |
| `/api/admin/training/upload` | POST | Generate Supabase Storage signed upload URL |
| `/api/admin/training/tracks` | GET | List tracks (existing) |
| `/api/admin/training/tracks` | POST | Create track (existing) |
| `/api/admin/training/tracks/[id]` | PATCH | Update track (name, items, order) |
| `/api/admin/training/tracks/[id]` | DELETE | Delete track |
| `/api/admin/training/progress` | GET | Agent progress data for admin Progress tab |
| `/api/dashboard/training/[id]/complete` | POST | Agent marks content item complete |

## New Dependencies

| Package | Purpose |
|---|---|
| `@dnd-kit/core` | Drag-and-drop primitives |
| `@dnd-kit/sortable` | Sortable list for track content ordering |
| `@supabase/supabase-js` | Supabase Storage file uploads (verify if already installed) |

Existing packages reused: Tiptap (editor), Radix Dialog (drawer), Sonner (toasts).

## Out of Scope

- Quiz builder (content type exists but no question/answer UI)
- Downloadable completion certificates (PDF generation)
- Public-facing `/learn` page updates
- SCORM or LTI integration
- Video upload to Supabase (videos stay on YouTube)
