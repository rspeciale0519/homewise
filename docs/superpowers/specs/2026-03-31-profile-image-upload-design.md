# Profile Image Upload — Design Spec

## Overview

Allow buyer/seller users to upload, crop, and manage a profile avatar image. The avatar appears in the header user menu icon, the user menu dropdown, and the profile settings page. Users who haven't uploaded a photo see their initials (existing behavior).

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Upload locations | Profile page + dropdown shortcut | Profile page is the full editor; dropdown links there for quick access |
| Avatar shape | Rounded square (16px radius) | Modern aesthetic, shows more image than circle |
| Editor interaction | Modal overlay | Keeps profile page clean; gives editor dedicated space |
| Image processing | Client-side crop before upload | Smaller uploads, instant feedback, no server-side Sharp dependency |
| Cropper library | `react-easy-crop` | Lightweight (~15KB), well-maintained, flexible crop mask |
| Storage bucket | New `user-avatars` bucket | Clean separation from `agent-photos`; independent access policies |
| Remove photo | Yes, revert to initials | Users should control their avatar completely |

## Component Architecture

### New Components

**`UserAvatar`** — Shared display component
- Location: `src/components/ui/user-avatar.tsx`
- Props: `avatarUrl: string | null`, `firstName: string`, `lastName: string`, `size: 'sm' | 'md' | 'lg'`
- Sizes: `sm` = 36px (header), `md` = 48px, `lg` = 96px (profile page)
- Shape: Rounded square (`border-radius` scales with size)
- Fallback: Initials on navy gradient (existing pattern)
- Uses `next/image` for optimization when `avatarUrl` is present

**`AvatarUpload`** — Profile page upload widget
- Location: `src/components/profile/avatar-upload.tsx`
- Renders `UserAvatar` (lg) with hover overlay: camera icon + "Change Photo" text
- Drop zone: accepts dragged images with visual highlight (dashed border, accent color)
- Click triggers hidden `<input type="file">`
- On file selection/drop: validates type + size, opens crop modal
- "Remove photo" button visible when avatar exists

**`AvatarCropModal`** — Crop and adjust dialog
- Location: `src/components/profile/avatar-crop-modal.tsx`
- Uses shadcn `Dialog` wrapping `react-easy-crop`
- Dark crop area with rounded-square crop mask
- Zoom slider (min 1x, max 3x)
- Drag to reposition
- Footer: Cancel + Save Photo buttons
- On save: crops via `<canvas>` to 512x512 WebP, uploads via API

### Modified Components

**`UserMenu`** (`src/components/layout/user-menu.tsx`)
- Replace initials `<span>` with `UserAvatar` component (sm size)
- Add "Change Photo" dropdown item that links to `/dashboard/profile#avatar`

**`ProfileForm`** (`src/app/dashboard/profile/profile-form.tsx`)
- Add `AvatarUpload` widget above the form fields

**`Header`** (`src/components/layout/header.tsx`)
- No direct changes — `UserMenu` handles the avatar display

### Utility

**`cropImage`** — Canvas crop utility
- Location: `src/lib/utils/crop-image.ts`
- Input: image source + crop area from `react-easy-crop`
- Output: `Blob` (WebP at 90% quality, 512x512px)
- Fallback: PNG export if browser lacks WebP canvas support

## API Endpoints

### `POST /api/user/avatar`

Upload a cropped avatar image.

- **Auth:** Required (Supabase session)
- **Content-Type:** `multipart/form-data`
- **Body:** `file` field with cropped image blob
- **Validation:**
  - Authenticated user
  - File type: JPEG, PNG, or WebP
  - Max size: 500KB
- **Behavior:**
  1. Upload to `user-avatars` bucket at path `{userId}/avatar.webp`
  2. Overwrites previous file (same path — no orphaned files)
  3. Update `UserProfile.avatarUrl` with public URL
  4. Return `{ avatarUrl: string }`
- **Errors:**
  - 401: Not authenticated
  - 400: Invalid file type or size
  - 500: Storage or database error

### `DELETE /api/user/avatar`

Remove the user's avatar, reverting to initials.

- **Auth:** Required (Supabase session)
- **Behavior:**
  1. Delete file from `user-avatars` bucket
  2. Set `UserProfile.avatarUrl` to `null`
  3. Return `{ success: true }`
- **Errors:**
  - 401: Not authenticated
  - 500: Storage or database error

### Existing `PATCH /api/user/profile`

Unchanged. Avatar upload is a separate endpoint because it handles `FormData` rather than JSON.

## Storage

- **Bucket:** `user-avatars` (new)
- **Access:** Public read (CDN-served), authenticated write
- **Path pattern:** `{userId}/avatar.webp`
- **One file per user** — overwritten on change, deleted on remove
- **Output format:** WebP, 90% quality, 512x512px max

## Data Model

No schema changes needed. The `UserProfile.avatarUrl` field already exists:

```prisma
model UserProfile {
  avatarUrl String?  // Already present — stores public URL from user-avatars bucket
}
```

## User Flow

1. **Profile page:** User sees current avatar (or initials) with hover overlay
2. **Trigger upload:** Click avatar or drag-and-drop an image onto it
3. **Validation:** Client checks file type (JPEG/PNG/WebP) and size (<5MB)
4. **Crop modal:** Opens with image loaded, rounded-square crop mask, zoom slider
5. **Adjust:** User drags to reposition, slides to zoom
6. **Save:** Client crops to 512x512 WebP blob, uploads to `/api/user/avatar`
7. **Confirm:** Modal closes, avatar updates everywhere (profile page, header, dropdown)
8. **Remove (optional):** "Remove photo" button deletes avatar, reverts to initials

**From dropdown menu:** "Change Photo" item links to `/dashboard/profile#avatar`, scrolling to the avatar section.

## Validation Rules

| Rule | Client | Server |
|------|--------|--------|
| File type: JPEG, PNG, WebP | Yes | Yes |
| Raw file size < 5MB | Yes | No (receives cropped file) |
| Cropped file size < 500KB | No (inherent from 512x512 WebP) | Yes |
| Authenticated user | N/A | Yes |

## Error Handling

| Scenario | Behavior |
|----------|----------|
| Invalid file type | Toast: "Please upload a JPEG, PNG, or WebP image" |
| File too large (>5MB) | Toast: "Image must be under 5MB" |
| Upload failure | Toast: "Failed to upload photo. Please try again." Modal stays open. |
| Delete failure | Toast with retry option |
| Slow upload | "Save Photo" button shows spinner, disabled during upload |
| Cancel crop | Modal closes, no changes made |
| Missing avatar on load | Falls back to initials (existing behavior) |
| No WebP canvas support | Falls back to PNG export |

## Accessibility

- Drop zone: `role="button"`, keyboard accessible (Enter/Space opens file picker)
- Crop area: arrow keys to reposition, +/- to zoom
- Modal: focus trap, Escape to close (shadcn Dialog handles this)
- State changes announced via `aria-live` regions
- All interactive elements have visible focus indicators

## Dependencies

**New package:**
- `react-easy-crop` — image cropping UI

**Existing (no changes):**
- `@supabase/supabase-js` — storage client
- `next/image` — optimized image display
- shadcn `Dialog` — modal wrapper
- shadcn `Slider` — zoom control
- `sonner` — toast notifications (already installed)

## Out of Scope

- Server-side image processing (Sharp/thumbnails)
- Image format conversion on upload (browser handles WebP export)
- Avatar display in contexts beyond header/profile (comments, reviews — future work)
- Animated avatars / GIF support
- Social login avatar import
