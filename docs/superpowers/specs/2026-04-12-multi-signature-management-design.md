# Multi-Signature Management Design

**Date:** 2026-04-12
**Status:** Approved

## Overview

Enhance the signature system to support multiple saved signatures per user, PNG file uploads (in addition to drawn signatures), and a signature picker in the document viewer toolbar.

## Current State

- `DocumentSignature` is one-to-one with `UserProfile` (userId is @unique)
- Only drawn signatures are supported (canvas → base64 PNG)
- Profile page shows a single signature with re-draw/delete actions
- Document viewer checks for a single `savedSignature` — if present, places immediately on click; if absent, opens a drawing modal

## Requirements

1. Users can save up to 10 signatures on their profile
2. Signatures can be drawn (existing SignaturePad) or uploaded as PNG files
3. Uploaded PNGs are checked for transparency; a warning is shown if none detected (non-blocking)
4. Each signature requires a user-provided label (e.g., "Full signature", "Initials")
5. In the document viewer, clicking the signature tool shows a popover with saved signatures to pick from, plus options to draw or upload a new one
6. When a user draws a signature directly on a document, they are prompted to optionally save it to their profile (with a label field)
7. The signature validation schema must accept base64 PNG data URLs

## Schema

### DocumentSignature (modified)

```prisma
model DocumentSignature {
  id        String   @id @default(cuid())
  userId    String
  label     String
  imageData String
  source    String          // "drawn" | "uploaded"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

Key change: `userId` is no longer `@unique`. One user can have many signatures. Added `label` and `source` fields.

## API Design

Route: `/api/documents/signatures`

### GET
Returns all signatures for the authenticated user, ordered by `createdAt` ascending.

Response: `{ signatures: Array<{ id, label, imageData, source, createdAt }> }`

### POST
Creates a new signature. Enforces the 10-signature limit.

Request body: `{ label: string, imageData: string, source: "drawn" | "uploaded" }`

Validation:
- `label` is required, trimmed, max 50 characters
- `imageData` must be a valid base64 PNG data URL
- `source` must be "drawn" or "uploaded"
- User must have fewer than 10 existing signatures

Response: `{ signature: { id, label, imageData, source, createdAt } }`

### PUT
Updates an existing signature's label.

Request body: `{ id: string, label: string }`

Validation:
- Signature must exist and belong to the authenticated user
- `label` rules same as POST

Response: `{ signature: { id, label, updatedAt } }`

### DELETE
Deletes a signature by ID.

Request body: `{ id: string }`

Validation:
- Signature must exist and belong to the authenticated user

Response: `{ success: true }`

## Profile Page: SignatureSection

### Layout
- Header: "My Signatures" with counter ("3 of 10")
- Grid of signature cards, each showing:
  - Thumbnail preview of the signature image
  - Label text
  - Source badge ("Drawn" / "Uploaded")
  - Edit (rename) and delete action buttons
- Footer actions: "Draw Signature" and "Upload Signature" buttons
- Buttons disabled with message when at 10 signatures

### Draw Flow
1. Click "Draw Signature"
2. SignaturePad modal opens
3. User draws and clicks Save
4. Label input dialog appears (required field)
5. POST to API with source: "drawn"
6. Card appears in the grid

### Upload Flow
1. Click "Upload Signature"
2. File picker opens (accepts `.png` only)
3. Preview shown with transparency check — warning banner if no transparent pixels detected
4. Label input dialog appears (required field)
5. POST to API with source: "uploaded"
6. Card appears in the grid

### Transparency Check
Load the PNG into an offscreen canvas, read pixel data with `getImageData`, check if any pixel has alpha < 255. If none do, show a yellow warning: "This image doesn't appear to have a transparent background. It may not look right on documents." Non-blocking — user can still save.

## Document Viewer: Signature Picker Popover

### Trigger
Clicking the signature tool button in the viewer toolbar.

### Popover Content (when user has saved signatures)
- List of saved signatures: small thumbnail (40px height) + label, clickable
- Divider
- "Draw new signature" option with pen icon
- "Upload signature" option with upload icon

### Popover Content (when user has no saved signatures)
- Skip the popover entirely, enter signature mode directly (same as current behavior — opens SignaturePad on document click)

### Placement Flow — Saved Signature
1. User clicks signature tool → popover opens
2. User clicks a saved signature → popover closes, enters signature placement mode with that image
3. User clicks on document → signature placed immediately at click position (150x60 default size)
4. Mode returns to cursor

### Placement Flow — Draw New
1. User clicks "Draw new signature" in popover → popover closes, enters signature mode
2. User clicks on document → SignaturePad modal opens
3. User draws and saves → signature placed on document
4. Toast appears: "Save this signature to your profile?" with label input + Save/Skip buttons
5. If Save: POST to API, signature available in future picker
6. If Skip: signature only on current document

### Placement Flow — Upload
1. User clicks "Upload signature" in popover → file picker opens
2. User selects PNG → transparency check + label input
3. POST to API to save, then enter placement mode with that image
4. User clicks on document → signature placed immediately

## Data Flow Changes

### Viewer Page (Server Component)
Instead of passing `savedSignature: string | null`, pass:
```typescript
savedSignatures: Array<{ id: string; label: string; imageData: string }>
```

### PdfViewerShell Props
```typescript
interface PdfViewerShellProps {
  documentPath: string;
  documentName: string;
  fileUrl: string;
  agentInfo: AgentInfo;
  savedSignatures: Array<{ id: string; label: string; imageData: string }>;
}
```

### State Management
- `activeSignatureImage: string | null` — the selected signature image for placement (replaces the old single `savedSignature` concept)
- When a saved signature is selected from the popover, `activeSignatureImage` is set
- When drawing a new one, `activeSignatureImage` is set after the pad saves

## Components Summary

### Modified Files
- `prisma/schema.prisma` — DocumentSignature schema change
- `src/app/api/documents/signatures/route.ts` — CRUD for multiple signatures
- `src/app/dashboard/profile/page.tsx` — Pass signature array
- `src/app/dashboard/profile/signature-section.tsx` — Multi-signature management UI
- `src/app/dashboard/documents/viewer/page.tsx` — Pass signature array
- `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` — Signature picker flow, save prompt
- `src/components/documents/viewer-toolbar.tsx` — Popover on signature button
- `src/types/document-viewer.ts` — Updated types
- `src/schemas/document-viewer.schema.ts` — Updated validation schema

### New Files
- `src/components/documents/signature-picker.tsx` — Popover component for selecting/drawing/uploading signatures
- `src/components/documents/signature-upload.tsx` — PNG upload with transparency check and preview
- `src/components/documents/save-signature-prompt.tsx` — Toast/dialog for saving drawn-on-document signatures

## Error Handling

- API returns 400 for invalid input (bad label, non-PNG data, missing fields)
- API returns 409 when at 10-signature limit
- Upload rejects non-PNG files at the file input level (accept attribute) and validates MIME type server-side
- Network errors show toast with retry option
- Transparency warning is informational only, never blocks saving
