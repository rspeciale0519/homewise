# Feature: In-App PDF Document Viewer

## Context

Agents currently download or open PDFs in external viewers when accessing documents from the Resource Hub and Document Library. This breaks the user flow and prevents any in-app interaction with the documents.

This feature builds a full-page in-app PDF viewer with annotation capabilities (click-to-place text and signatures), export actions (download, print, email), and productivity features (auto-populate agent/contact info, save drafts, favorites, recents). The signature system is a standalone profile feature — agents can draw and save their signature from their profile page for reuse across all documents.

**Critical technical constraint:** All 48 PDFs in `/private/documents/` are static (no AcroForm fillable fields). The solution uses an annotation overlay approach — rendering PDFs visually and letting users click anywhere to place text or signatures, then merging annotations into the PDF server-side for export.

**Branch:** `feature/document-viewer` (already created from `develop`)

---

## Architecture Overview

### Libraries

| Library | Purpose | Install |
|---------|---------|---------|
| `react-pdf` | Render PDF pages in browser (wraps pdfjs-dist) | `npm install react-pdf` |
| `pdf-lib` | Merge annotations into PDF server-side for export | `npm install pdf-lib` |
| `react-signature-canvas` | Canvas-based signature drawing | `npm install react-signature-canvas @types/react-signature-canvas` |

### Route

Full-page viewer at `/dashboard/documents/viewer?doc=office/transaction-checklist.pdf&draftId=abc123`

- `doc` param: PDF path relative to `private/documents/`
- `draftId` param (optional): resume a saved draft

### Coordinate System

Two coordinate systems must map precisely:

- **PDF coordinates (pdf-lib):** Origin bottom-left, Y increases upward, units in points (1pt = 1/72 inch). US Letter = 612 x 792 points.
- **Screen coordinates (react-pdf):** Origin top-left, Y increases downward, units in CSS pixels. Dimensions depend on zoom/scale.

Annotations are **always stored in PDF points** for zoom independence and direct use in pdf-lib export. Conversion functions in `src/lib/documents/coordinates.ts`:

```typescript
// Click on overlay → PDF coordinates
function screenToPdf(clickX: number, clickY: number, dims: PageDimensions): { pdfX: number; pdfY: number }

// PDF coordinates → screen position (for rendering annotations on overlay)
function pdfToScreen(pdfX: number, pdfY: number, dims: PageDimensions): { screenX: number; screenY: number }
```

### Database Models (4 new)

```prisma
model DocumentSignature {
  id        String   @id @default(cuid())
  agentId   String   @unique
  imageData String   // base64 PNG (~5-15KB)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  agent     Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
}

model DocumentDraft {
  id           String   @id @default(cuid())
  agentId      String
  documentPath String
  documentName String
  annotations  Json     // serialized Annotation[]
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  agent        Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@unique([agentId, documentPath])
  @@index([agentId])
}

model DocumentFavorite {
  id           String   @id @default(cuid())
  agentId      String
  documentPath String
  documentName String
  savedAt      DateTime @default(now())
  agent        Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@unique([agentId, documentPath])
  @@index([agentId])
}

model DocumentRecent {
  id           String   @id @default(cuid())
  agentId      String
  documentPath String
  documentName String
  viewedAt     DateTime @default(now())
  agent        Agent    @relation(fields: [agentId], references: [id], onDelete: Cascade)
  @@unique([agentId, documentPath])
  @@index([agentId])
  @@index([viewedAt])
}
```

Add relations to the `Agent` model:
```prisma
documentSignature  DocumentSignature?
documentDrafts     DocumentDraft[]
documentFavorites  DocumentFavorite[]
documentRecents    DocumentRecent[]
```

### Core Type Definitions

File: `src/types/document-viewer.ts`

```typescript
interface Annotation {
  id: string;
  pageIndex: number;        // 0-based
  pdfX: number;             // PDF points from left
  pdfY: number;             // PDF points from bottom
  type: "text" | "signature";
  value: string;            // text content or base64 PNG
  fontSize: number;         // PDF points (default 12)
  color: string;            // hex (default "#000000")
  width?: number;           // signature width in PDF points
  height?: number;          // signature height in PDF points
}

type AnnotationMode = "cursor" | "text" | "signature" | "agent-field" | "contact-field";

interface AgentInfo {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  brokerageName: string;
  licenseNumber: string | null;
}

interface DraftAnnotations {
  version: 1;
  documentPath: string;
  annotations: Annotation[];
  selectedContactId: string | null;
  lastModified: string;
}
```

---

## Component Tree

```
page.tsx (Server Component — auth, fetch agent data)
  └── PdfViewerShell (Client — state orchestrator, ~200 LOC)
        ├── ViewerToolbar (~180 LOC)
        │     ├── Back button, document title, page indicator
        │     ├── ZoomControls (in/out/fit)
        │     ├── AnnotationModeSelector (cursor/text/signature/agent-info/contact-info)
        │     └── Action buttons (save draft, download, print, email, favorite toggle)
        ├── PdfPageRenderer (~200 LOC)
        │     └── For each visible page: react-pdf <Page> + AnnotationOverlay
        ├── AnnotationOverlay (~180 LOC, one per page)
        │     ├── Handles click-to-place
        │     ├── Renders text annotations (editable, movable, deletable)
        │     └── Renders signature images (movable, deletable)
        ├── AnnotationPlacer (~150 LOC)
        │     ├── Free text input popover
        │     ├── Agent field dropdown (name, license, phone, email, brokerage)
        │     └── Contact field dropdown (first name, last name, email, phone, address)
        ├── ContactPicker (~130 LOC)
        │     └── Searchable dropdown of agent's contacts
        ├── SignaturePad (~120 LOC, SHARED with profile page)
        │     ├── Canvas drawing surface
        │     └── Controls: clear, save, cancel
        ├── EmailDialog (~120 LOC)
        │     ├── Recipient email, subject, message
        │     └── Send button
        └── ValidationPanel (~100 LOC)
              └── Lists empty required annotations
```

---

## Phase 1: Core PDF Viewer & Navigation

**Goal:** Render PDFs in-app with page navigation and zoom. Wire up document links.

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/app/dashboard/documents/viewer/page.tsx` | Server component: auth guard, fetch agent/doc data, validate `doc` param | ~80 |
| `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` | Client shell: zoom/scroll/page state, orchestrates child components | ~200 |
| `src/components/documents/pdf-page-renderer.tsx` | Renders PDF pages via react-pdf `<Document>` and `<Page>`, intersection observer for virtualization | ~200 |
| `src/components/documents/viewer-toolbar.tsx` | Top toolbar: back button, doc title, zoom controls, page indicator | ~150 |

### Files to Modify

| File | Change |
|------|--------|
| `src/components/content/document-list.tsx` | Change `<a>` download links to `<Link>` to viewer route (PDF files only; .docx and external links unchanged) |
| `src/app/dashboard/agent-hub/page.tsx` | Same — Quick Access Documents link to viewer instead of download |
| `next.config.ts` | Configure pdf.js worker (either webpack copy plugin or CDN workerSrc) |

### Key Decisions

- **pdf.js worker:** Use CDN URL (`unpkg.com/pdfjs-dist@{version}/build/pdf.worker.min.mjs`) to avoid webpack config complexity
- **Page virtualization:** Only render pages within viewport ± 1 page buffer using IntersectionObserver
- **Zoom:** Default to fit-width. Store scale as a number (1.0 = 100%). Range: 0.5–3.0.

### Reuse

- Button component: `src/components/ui/button.tsx` (existing variants: primary, ghost, outline)
- Navigation: follow existing `Link` patterns from document-list.tsx

---

## Phase 2: Signature System (Profile + Viewer)

**Goal:** Agents draw, save, re-draw, and delete their signature from their profile page. Signature is stored for reuse in the viewer.

### Database Migration

Add `DocumentSignature` model to `prisma/schema.prisma`. Add `documentSignature` relation to `Agent` model.

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/components/documents/signature-pad.tsx` | Reusable canvas signature drawing component (draw, clear, redo) | ~120 |
| `src/app/dashboard/profile/signature-section.tsx` | "My Signature" section on profile page: display saved signature, draw new, re-draw, delete | ~150 |
| `src/app/api/documents/signatures/route.ts` | GET (fetch saved), PUT (create/replace), DELETE | ~100 |
| `src/schemas/document-viewer.schema.ts` | Zod schemas for all document viewer API endpoints | ~80 |

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `DocumentSignature` model + Agent relation |
| `src/app/dashboard/profile/page.tsx` | Add `<SignatureSection>` below existing `<ProfileForm>`, conditionally rendered for agent/admin roles |

### Signature Storage

- Base64 PNG string in database column (~5-15KB per signature)
- One signature per agent (`@unique` on `agentId`)
- No external storage needed — signatures are tiny

### Profile Page UX

- **No signature saved:** Shows placeholder with "Draw your signature" button → opens SignaturePad modal
- **Signature saved:** Shows signature preview image with "Re-draw" and "Delete" buttons
- Re-draw replaces the existing signature (PUT upsert)
- Delete removes the signature (DELETE)

---

## Phase 3: Annotation System (Text + Signature Placement)

**Goal:** Click-to-place text and signatures on PDF pages. Agent info auto-populate. Contact info pre-fill.

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/components/documents/annotation-overlay.tsx` | Transparent overlay per page: click handling, renders placed annotations, drag/delete | ~180 |
| `src/components/documents/annotation-placer.tsx` | Popover for choosing what to place: free text, agent field, contact field | ~150 |
| `src/components/documents/contact-picker.tsx` | Searchable contact dropdown for pre-fill | ~130 |
| `src/lib/documents/coordinates.ts` | `screenToPdf`, `pdfToScreen`, `PageDimensions` type | ~60 |
| `src/types/document-viewer.ts` | All TypeScript interfaces (Annotation, AnnotationMode, AgentInfo, etc.) | ~60 |

### Files to Modify

| File | Change |
|------|--------|
| `pdf-viewer-shell.tsx` | Add annotation state array, active mode, selected contact, isDirty flag |
| `viewer-toolbar.tsx` | Add annotation mode selector buttons (cursor, text, signature, agent info, contact info) |
| `pdf-page-renderer.tsx` | Compose `<AnnotationOverlay>` on top of each `<Page>` |

### API Route

| File | Purpose |
|------|---------|
| `src/app/api/contacts/search/route.ts` | GET: search agent's contacts by name/email. Returns `[{id, firstName, lastName, email, phone}]`. Used by ContactPicker. |

### Annotation Placement Flow

1. Agent selects mode from toolbar (e.g., "Agent Name")
2. Agent clicks on the PDF page
3. `AnnotationOverlay.onClick` fires, computes PDF coordinates via `screenToPdf`
4. New `Annotation` object created with value resolved from agent data
5. Annotation appended to state array, `isDirty = true`
6. Mode resets to "cursor"

For signatures: if saved signature exists, it's placed immediately. If none exists, SignaturePad modal opens first.

### Annotation Interactions

- **Move:** Drag annotation to reposition (updates pdfX/pdfY)
- **Delete:** Click delete icon on annotation (removes from array)
- **Edit text:** Double-click text annotation to edit content
- **Resize signature:** Drag corner handle (updates width/height, maintains aspect ratio)

---

## Phase 4: Export Actions (Download, Print, Email)

**Goal:** Merge annotations into PDF and export via download, print, or email with attachment.

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/lib/documents/pdf-merger.ts` | Core logic: takes PDF buffer + Annotation[] → returns modified PDF buffer using pdf-lib | ~150 |
| `src/app/api/documents/export/route.ts` | POST: reads original PDF, calls pdf-merger, returns buffer or sends email. `maxDuration = 60` | ~120 |
| `src/components/documents/email-dialog.tsx` | Radix Dialog: recipient email, subject, optional message, send button | ~120 |
| `src/components/documents/validation-panel.tsx` | Panel showing unfilled required fields, "jump to" links | ~100 |

### Files to Modify

| File | Change |
|------|--------|
| `viewer-toolbar.tsx` | Add Download, Print, Email action buttons |
| `pdf-viewer-shell.tsx` | Add export handlers, email dialog state, validation state |
| `src/lib/email/index.ts` | Extend `SendEmailInput` interface to support `attachments` parameter (Resend v6.9.3 already supports it) |

### Export Flow

**Download:**
1. Client POSTs to `/api/documents/export` with `{documentPath, annotations, action: "download"}`
2. Server reads PDF from `/private/documents/`, uses pdf-lib to embed text/images at annotation coordinates
3. Returns PDF buffer with `Content-Disposition: attachment`
4. Client triggers browser download

**Print:**
1. Same as download — client receives PDF blob
2. Opens blob URL in new window
3. Calls `window.print()` on the new window

**Email:**
1. Client opens EmailDialog → user enters recipient, subject, message
2. Client POSTs to `/api/documents/export` with `{..., action: "email", emailTo, emailSubject, emailMessage}`
3. Server merges PDF, then calls `sendEmail` with PDF buffer as Resend attachment
4. Returns success/error response
5. Toast notification

### pdf-lib Merging Logic (in pdf-merger.ts)

```typescript
for (const annotation of annotations) {
  const page = pdfDoc.getPage(annotation.pageIndex);
  if (annotation.type === "text") {
    page.drawText(annotation.value, {
      x: annotation.pdfX,
      y: annotation.pdfY,
      size: annotation.fontSize,
      color: rgb(r, g, b),
    });
  } else if (annotation.type === "signature") {
    const pngImage = await pdfDoc.embedPng(annotation.value);
    page.drawImage(pngImage, {
      x: annotation.pdfX,
      y: annotation.pdfY,
      width: annotation.width,
      height: annotation.height,
    });
  }
}
```

### Email Attachment Extension

Extend `src/lib/email/index.ts`:
```typescript
interface SendEmailInput {
  // ...existing fields...
  attachments?: Array<{
    filename: string;
    content: Buffer;
  }>;
}
```

Pass through to Resend's `emails.send()` which already supports attachments.

---

## Phase 5: Persistence & Productivity (Drafts, Favorites, Recents)

**Goal:** Save/resume drafts, bookmark favorites, track recently viewed, form validation.

### Database Migration

Add `DocumentDraft`, `DocumentFavorite`, `DocumentRecent` models to `prisma/schema.prisma`. Add relations to `Agent` model.

### Files to Create

| File | Purpose | LOC |
|------|---------|-----|
| `src/app/api/documents/drafts/route.ts` | GET (list all agent drafts), POST (create new draft) | ~100 |
| `src/app/api/documents/drafts/[id]/route.ts` | GET (single), PATCH (update annotations), DELETE | ~120 |
| `src/app/api/documents/favorites/route.ts` | GET (list), POST (add), DELETE (remove) | ~90 |
| `src/app/api/documents/recents/route.ts` | GET (list, cap at 20), POST (upsert viewedAt) | ~80 |

### Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add 3 new models + Agent relations |
| `pdf-viewer-shell.tsx` | Add auto-save debounce (30s), draft load/save handlers, favorite toggle |
| `viewer-toolbar.tsx` | Add favorite star button, draft saved indicator, "Drafts" dropdown |
| `src/components/content/document-list.tsx` | Add favorite toggle heart icon per document |
| `src/app/dashboard/agent-hub/page.tsx` | Add "Recently Used" and "Favorites" sections to Resource Hub |

### Draft Auto-Save

- `useEffect` with 30-second debounce after last annotation change
- Only saves if `isDirty` is true
- Upsert pattern: `@@unique([agentId, documentPath])` ensures one draft per document per agent
- Draft state serialized as JSON in `annotations` column

### Recently Viewed

- Tracked automatically when agent opens a document in the viewer
- Upsert with `viewedAt` update (same pattern as existing `RecentlyViewed` model)
- Capped at 20 entries per agent (delete oldest on insert)
- Displayed on Resource Hub page

### Favorites

- Toggle via star/heart icon in document list and viewer toolbar
- `@@unique([agentId, documentPath])` prevents duplicates
- Displayed on Resource Hub page as a quick-access section

### Form Validation

- ValidationPanel shows a checklist of annotations that should exist before export
- Non-blocking — agents can still download/print/email without all fields filled
- Warning toast: "Some fields may be incomplete" with option to proceed anyway

---

## File Summary

### New Files (23 total)

| # | File | Phase |
|---|------|-------|
| 1 | `src/app/dashboard/documents/viewer/page.tsx` | 1 |
| 2 | `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` | 1 |
| 3 | `src/components/documents/pdf-page-renderer.tsx` | 1 |
| 4 | `src/components/documents/viewer-toolbar.tsx` | 1 |
| 5 | `src/components/documents/signature-pad.tsx` | 2 |
| 6 | `src/app/dashboard/profile/signature-section.tsx` | 2 |
| 7 | `src/app/api/documents/signatures/route.ts` | 2 |
| 8 | `src/schemas/document-viewer.schema.ts` | 2 |
| 9 | `src/components/documents/annotation-overlay.tsx` | 3 |
| 10 | `src/components/documents/annotation-placer.tsx` | 3 |
| 11 | `src/components/documents/contact-picker.tsx` | 3 |
| 12 | `src/lib/documents/coordinates.ts` | 3 |
| 13 | `src/types/document-viewer.ts` | 3 |
| 14 | `src/app/api/contacts/search/route.ts` | 3 |
| 15 | `src/lib/documents/pdf-merger.ts` | 4 |
| 16 | `src/app/api/documents/export/route.ts` | 4 |
| 17 | `src/components/documents/email-dialog.tsx` | 4 |
| 18 | `src/components/documents/validation-panel.tsx` | 4 |
| 19 | `src/app/api/documents/drafts/route.ts` | 5 |
| 20 | `src/app/api/documents/drafts/[id]/route.ts` | 5 |
| 21 | `src/app/api/documents/favorites/route.ts` | 5 |
| 22 | `src/app/api/documents/recents/route.ts` | 5 |
| 23 | `src/hooks/use-track-document-view.ts` | 5 |

### Modified Files (8 total)

| File | Phases |
|------|--------|
| `prisma/schema.prisma` | 2, 5 |
| `src/components/content/document-list.tsx` | 1, 5 |
| `src/app/dashboard/agent-hub/page.tsx` | 1, 5 |
| `src/app/dashboard/profile/page.tsx` | 2 |
| `src/lib/email/index.ts` | 4 |
| `next.config.ts` | 1 |
| `src/data/content/agent-resources.ts` | 1 (if ResourceDocument type needs updating) |
| `package.json` | 1 (new dependencies) |

---

## Verification Plan

### Per-Phase Verification

**Phase 1:**
- `npm run type-check` passes
- Navigate to `/dashboard/agent-hub/documents`, click a PDF → viewer opens at `/dashboard/documents/viewer`
- PDF renders correctly, zoom in/out works, page navigation works
- Back button returns to document library
- Browser console: no errors

**Phase 2:**
- `npx prisma migrate dev` succeeds
- Profile page shows "My Signature" section (agent/admin only)
- Draw signature on canvas → save → signature appears as preview
- Re-draw replaces signature → delete removes it
- API: `GET /api/documents/signatures` returns saved signature

**Phase 3:**
- Click "Text" mode in toolbar → click on PDF → text input appears at click position
- Type text → annotation renders on overlay at correct position
- Select "Agent Name" → click on PDF → agent's name placed at position
- Select contact → select "Email" → click on PDF → contact's email placed
- Drag annotations to reposition, delete with X button
- Zoom in/out → annotations stay aligned with PDF content

**Phase 4:**
- Click Download → filled PDF downloads with all annotations embedded at correct positions
- Click Print → new window opens with filled PDF, print dialog appears
- Click Email → dialog opens → enter recipient → send → email arrives with PDF attachment
- Verify annotation positions in downloaded PDF match what was shown in viewer

**Phase 5:**
- Auto-save triggers after 30s of inactivity with changes
- Close viewer → reopen same document → draft loads with all annotations restored
- Favorite toggle works in document list and viewer
- Recently Used section shows on Resource Hub
- `npm run build` succeeds (full build verification)

### End-to-End Smoke Test

1. Open Resource Hub → click a document → viewer loads
2. Place agent name, phone, email on the PDF
3. Select a contact → place their name and address
4. Click to place signature (draw if none saved)
5. Save draft → close → reopen → verify all annotations restored
6. Download PDF → open downloaded file → verify all content at correct positions
7. Email PDF → verify email arrives with correct attachment
8. Print PDF → verify print dialog with correct content

### Browser Testing

Use Playwright MCP tools to:
- Verify no console errors during viewer operations
- Test zoom interactions
- Test annotation placement accuracy
- Verify responsive behavior
