# Profile Image Upload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow buyer/seller users to upload, crop, and manage a profile avatar that displays in the header and profile page.

**Architecture:** Client-side crop with `react-easy-crop` inside a shadcn-style Dialog, uploading the cropped WebP blob to a new Supabase Storage `user-avatars` bucket via `/api/user/avatar`. A shared `UserAvatar` component replaces hardcoded initials everywhere.

**Tech Stack:** Next.js 16, react-easy-crop, @radix-ui/react-dialog (already installed), Supabase Storage, Prisma, sonner (toasts), Vitest + Testing Library

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/utils/crop-image.ts` | Canvas crop utility — takes image + crop area, returns WebP Blob |
| Create | `src/lib/utils/crop-image.test.ts` | Tests for crop utility |
| Create | `src/components/ui/user-avatar.tsx` | Shared avatar display (image or initials fallback) |
| Create | `src/components/ui/user-avatar.test.tsx` | Tests for UserAvatar |
| Create | `src/components/profile/avatar-crop-modal.tsx` | Dialog with react-easy-crop, zoom slider, save/cancel |
| Create | `src/components/profile/avatar-upload.tsx` | Profile page widget — drop zone, click-to-upload, remove button |
| Create | `src/app/api/user/avatar/route.ts` | POST (upload) and DELETE (remove) avatar endpoints |
| Modify | `src/app/dashboard/layout.tsx:40-50` | Add sonner `Toaster` for dashboard toast notifications |
| Modify | `src/app/dashboard/profile/page.tsx:17-37` | Pass `avatarUrl` prop, add avatar section above form |
| Modify | `src/app/dashboard/profile/profile-form.tsx:7-9,57` | Accept `avatarUrl`/`onAvatarChange` props, render `AvatarUpload` |
| Modify | `src/components/layout/user-menu.tsx:22-33,43-51,67-77` | Use `UserAvatar`, fetch `avatarUrl`, add "Change Photo" link |

---

### Task 1: Install react-easy-crop

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the dependency**

```bash
npm install react-easy-crop --legacy-peer-deps
```

- [ ] **Step 2: Verify installation**

```bash
node -e "require('react-easy-crop')" && echo "OK"
```

Expected: `OK` (no errors)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: install react-easy-crop for avatar editor"
```

---

### Task 2: Create crop-image utility with tests

**Files:**
- Create: `src/lib/utils/crop-image.ts`
- Create: `src/lib/utils/crop-image.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/utils/crop-image.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getCroppedBlob, type CropArea } from "./crop-image";

// Mock canvas and image APIs for jsdom
function createMockImage(width: number, height: number) {
  const img = {
    width,
    height,
    onload: null as (() => void) | null,
    onerror: null as ((e: unknown) => void) | null,
    src: "",
  };
  // Trigger onload when src is set
  Object.defineProperty(img, "src", {
    set() {
      setTimeout(() => img.onload?.(), 0);
    },
    get() {
      return "blob:mock";
    },
  });
  return img;
}

describe("getCroppedBlob", () => {
  const mockCropArea: CropArea = { x: 10, y: 20, width: 200, height: 200 };
  let mockContext: Record<string, unknown>;
  let mockCanvas: Record<string, unknown>;

  beforeEach(() => {
    mockContext = {
      drawImage: vi.fn(),
    };
    mockCanvas = {
      getContext: vi.fn(() => mockContext),
      width: 0,
      height: 0,
      toBlob: vi.fn((cb: (blob: Blob | null) => void) => {
        cb(new Blob(["fake-image"], { type: "image/webp" }));
      }),
    };
    vi.stubGlobal("document", {
      createElement: vi.fn(() => mockCanvas),
    });
    vi.stubGlobal("Image", vi.fn(() => createMockImage(400, 400)));
  });

  it("returns a Blob with image/webp type", async () => {
    const blob = await getCroppedBlob("blob:test-url", mockCropArea);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/webp");
  });

  it("creates a 512x512 canvas", async () => {
    await getCroppedBlob("blob:test-url", mockCropArea);
    expect(mockCanvas.width).toBe(512);
    expect(mockCanvas.height).toBe(512);
  });

  it("calls drawImage with correct crop coordinates", async () => {
    await getCroppedBlob("blob:test-url", mockCropArea);
    expect(mockContext.drawImage).toHaveBeenCalledWith(
      expect.anything(),
      10, 20, 200, 200,
      0, 0, 512, 512
    );
  });

  it("falls back to image/png if webp toBlob returns null", async () => {
    let callCount = 0;
    mockCanvas.toBlob = vi.fn((cb: (blob: Blob | null) => void, type: string) => {
      callCount++;
      if (type === "image/webp") {
        cb(null);
      } else {
        cb(new Blob(["fake-png"], { type: "image/png" }));
      }
    });

    const blob = await getCroppedBlob("blob:test-url", mockCropArea);
    expect(blob.type).toBe("image/png");
    expect(callCount).toBe(2);
  });

  it("rejects if canvas context is unavailable", async () => {
    mockCanvas.getContext = vi.fn(() => null);
    await expect(getCroppedBlob("blob:test-url", mockCropArea)).rejects.toThrow(
      "Canvas context unavailable"
    );
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/lib/utils/crop-image.test.ts
```

Expected: FAIL — module `./crop-image` not found

- [ ] **Step 3: Write the implementation**

Create `src/lib/utils/crop-image.ts`:

```typescript
export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

const OUTPUT_SIZE = 512;
const WEBP_QUALITY = 0.9;

export async function getCroppedBlob(
  imageSrc: string,
  cropArea: CropArea
): Promise<Blob> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context unavailable");

  ctx.drawImage(
    image,
    cropArea.x,
    cropArea.y,
    cropArea.width,
    cropArea.height,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  const blob = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (blob) return blob;

  const pngBlob = await canvasToBlob(canvas, "image/png");
  if (pngBlob) return pngBlob;

  throw new Error("Failed to export canvas to blob");
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/lib/utils/crop-image.test.ts
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/crop-image.ts src/lib/utils/crop-image.test.ts
git commit -m "feat: add canvas crop utility for avatar image processing"
```

---

### Task 3: Create UserAvatar component with tests

**Files:**
- Create: `src/components/ui/user-avatar.tsx`
- Create: `src/components/ui/user-avatar.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/ui/user-avatar.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserAvatar } from "./user-avatar";

describe("UserAvatar", () => {
  it("renders initials when no avatarUrl", () => {
    render(<UserAvatar firstName="John" lastName="Doe" size="md" avatarUrl={null} />);
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("renders single initial for first name only", () => {
    render(<UserAvatar firstName="John" lastName="" size="md" avatarUrl={null} />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("renders image when avatarUrl is provided", () => {
    render(
      <UserAvatar
        firstName="John"
        lastName="Doe"
        size="md"
        avatarUrl="https://example.com/avatar.webp"
      />
    );
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("alt", "John Doe");
  });

  it("applies sm size classes", () => {
    const { container } = render(
      <UserAvatar firstName="J" lastName="D" size="sm" avatarUrl={null} />
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("h-9");
    expect(el?.className).toContain("w-9");
  });

  it("applies lg size classes", () => {
    const { container } = render(
      <UserAvatar firstName="J" lastName="D" size="lg" avatarUrl={null} />
    );
    const el = container.firstElementChild;
    expect(el?.className).toContain("h-24");
    expect(el?.className).toContain("w-24");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/components/ui/user-avatar.test.tsx
```

Expected: FAIL — module `./user-avatar` not found

- [ ] **Step 3: Write the implementation**

Create `src/components/ui/user-avatar.tsx`:

```tsx
import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  size: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CONFIG = {
  sm: { container: "h-9 w-9 rounded-lg", text: "text-xs", px: 36 },
  md: { container: "h-12 w-12 rounded-xl", text: "text-sm", px: 48 },
  lg: { container: "h-24 w-24 rounded-2xl", text: "text-2xl", px: 96 },
} as const;

export function UserAvatar({
  avatarUrl,
  firstName,
  lastName,
  size,
  className,
}: UserAvatarProps) {
  const config = SIZE_CONFIG[size];
  const initials = getInitials(firstName, lastName);

  if (avatarUrl) {
    return (
      <div
        className={cn(
          config.container,
          "relative overflow-hidden flex-shrink-0",
          className
        )}
      >
        <Image
          src={avatarUrl}
          alt={`${firstName} ${lastName}`.trim()}
          fill
          className="object-cover"
          sizes={`${config.px}px`}
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        config.container,
        "bg-navy-600 text-white font-bold flex items-center justify-center flex-shrink-0 shadow-sm",
        config.text,
        className
      )}
    >
      {initials}
    </div>
  );
}

function getInitials(first: string, last: string): string {
  if (first && last) return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
  if (first) return first.charAt(0).toUpperCase();
  return "U";
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/components/ui/user-avatar.test.tsx
```

Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/user-avatar.tsx src/components/ui/user-avatar.test.tsx
git commit -m "feat: add shared UserAvatar component with initials fallback"
```

---

### Task 4: Create avatar API routes (POST + DELETE)

**Files:**
- Create: `src/app/api/user/avatar/route.ts`

Reference files to read first:
- `src/app/api/admin/upload/route.ts` — existing upload pattern
- `src/app/api/user/profile/route.ts` — user auth pattern
- `src/lib/supabase/server.ts` — server Supabase client
- `src/lib/supabase/admin.ts` — admin client for storage

- [ ] **Step 1: Create the route file**

Create `src/app/api/user/avatar/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { prisma } from "@/lib/prisma";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 500 * 1024; // 500KB (already cropped)
const BUCKET = "user-avatars";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: JPEG, PNG, WebP" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 500KB" },
      { status: 400 }
    );
  }

  const filePath = `${user.id}/avatar.webp`;
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error("[user/avatar] Upload error:", uploadError.message);
    return NextResponse.json(
      { error: `Upload failed: ${uploadError.message}` },
      { status: 500 }
    );
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(filePath);

  // Append cache-buster so browsers/CDN pick up the new image
  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { avatarUrl },
  });

  return NextResponse.json({ avatarUrl });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const filePath = `${user.id}/avatar.webp`;

  const { error: deleteError } = await admin.storage
    .from(BUCKET)
    .remove([filePath]);

  if (deleteError) {
    console.error("[user/avatar] Delete error:", deleteError.message);
    return NextResponse.json(
      { error: `Delete failed: ${deleteError.message}` },
      { status: 500 }
    );
  }

  await prisma.userProfile.update({
    where: { id: user.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Verify the file compiles**

```bash
npx tsc --noEmit src/app/api/user/avatar/route.ts 2>&1 | head -20
```

If type errors appear, fix them. Common issue: ensure `prisma` import resolves.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/user/avatar/route.ts
git commit -m "feat: add POST/DELETE avatar API endpoints with Supabase Storage"
```

---

### Task 5: Add Toaster to dashboard layout

**Files:**
- Modify: `src/app/dashboard/layout.tsx`

The dashboard layout currently has no toast provider. Admin uses `AdminToastProvider` but that's scoped to `/admin`. We need sonner's `Toaster` in the dashboard layout for avatar upload feedback.

- [ ] **Step 1: Create a dashboard toast wrapper**

We can't import `Toaster` (client component) directly into the server layout. Create a thin client wrapper.

Create `src/components/dashboard/dashboard-toaster.tsx`:

```tsx
"use client";

import { Toaster } from "sonner";

export function DashboardToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "rounded-xl text-sm font-medium shadow-lg",
        },
      }}
    />
  );
}
```

- [ ] **Step 2: Add DashboardToaster to the dashboard layout**

In `src/app/dashboard/layout.tsx`, add the import at the top with the other imports:

```typescript
import { DashboardToaster } from "@/components/dashboard/dashboard-toaster";
```

Then wrap the return JSX — add `<DashboardToaster />` as a sibling of the main content. Change the return from:

```tsx
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
```

To:

```tsx
  return (
    <div className="min-h-screen bg-slate-50/50">
      <Header />
      <div className="flex min-h-[calc(100vh-4rem)]">
        <Sidebar role={userRole} />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <DashboardToaster />
    </div>
  );
```

- [ ] **Step 3: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/dashboard-toaster.tsx src/app/dashboard/layout.tsx
git commit -m "feat: add sonner Toaster to dashboard layout"
```

---

### Task 6: Create AvatarCropModal component

**Files:**
- Create: `src/components/profile/avatar-crop-modal.tsx`

Reference: Read `node_modules/react-easy-crop/types.d.ts` for the `Area` type and `Cropper` component props before writing this.

- [ ] **Step 1: Create the modal component**

Create `src/components/profile/avatar-crop-modal.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import * as Dialog from "@radix-ui/react-dialog";
import { getCroppedBlob } from "@/lib/utils/crop-image";

interface AvatarCropModalProps {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (blob: Blob) => void;
}

export function AvatarCropModal({
  open,
  onClose,
  imageSrc,
  onCropComplete,
}: AvatarCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedArea, setCroppedArea] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCropComplete = useCallback(
    (_croppedAreaPx: Area, croppedAreaPixels: Area) => {
      setCroppedArea(croppedAreaPixels);
    },
    []
  );

  const handleSave = async () => {
    if (!croppedArea) return;
    setSaving(true);
    try {
      const blob = await getCroppedBlob(imageSrc, croppedArea);
      onCropComplete(blob);
    } catch {
      // Parent handles upload errors; crop failure is rare
    } finally {
      setSaving(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !saving) {
      onClose();
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 duration-200" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 slide-in-from-left-1/2 slide-in-from-top-[48%] duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <Dialog.Title className="text-base font-semibold text-navy-700">
              Edit Profile Photo
            </Dialog.Title>
            <Dialog.Close className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </Dialog.Close>
          </div>

          {/* Crop area */}
          <div className="relative h-72 bg-slate-900">
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="rect"
              showGrid={false}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
              style={{
                cropAreaStyle: {
                  borderRadius: "16px",
                  border: "2px solid white",
                },
              }}
            />
          </div>

          {/* Zoom slider */}
          <div className="flex items-center gap-3 px-5 py-3">
            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M8 11h6" />
            </svg>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-navy-600 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-navy-600 [&::-webkit-slider-thumb]:cursor-pointer"
              aria-label="Zoom"
            />
            <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
              <path d="M8 11h6M11 8v6" />
            </svg>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-10 px-4 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !croppedArea}
              className="h-10 px-5 rounded-xl bg-navy-600 text-sm font-semibold text-white hover:bg-navy-700 active:bg-navy-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Saving...
                </>
              ) : (
                "Save Photo"
              )}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: No errors. If `react-easy-crop` types need checking, read `node_modules/react-easy-crop/types.d.ts` first.

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/avatar-crop-modal.tsx
git commit -m "feat: add avatar crop modal with react-easy-crop and zoom slider"
```

---

### Task 7: Create AvatarUpload component

**Files:**
- Create: `src/components/profile/avatar-upload.tsx`

Reference: Read `src/components/admin/photo-upload.tsx` for drag-drop patterns used in the project.

- [ ] **Step 1: Create the upload widget**

Create `src/components/profile/avatar-upload.tsx`:

```tsx
"use client";

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { AvatarCropModal } from "./avatar-crop-modal";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  avatarUrl: string | null;
  firstName: string;
  lastName: string;
  onAvatarChange: (url: string | null) => void;
}

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_RAW_SIZE = 5 * 1024 * 1024; // 5MB before crop

export function AvatarUpload({
  avatarUrl,
  firstName,
  lastName,
  onAvatarChange,
}: AvatarUploadProps) {
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndOpen = useCallback((file: File) => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_RAW_SIZE) {
      toast.error("Image must be under 5MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setCropSrc(objectUrl);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) validateAndOpen(file);
    },
    [validateAndOpen]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) validateAndOpen(file);
      if (inputRef.current) inputRef.current.value = "";
    },
    [validateAndOpen]
  );

  const handleCropComplete = async (blob: Blob) => {
    setCropSrc(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", blob, "avatar.webp");

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Upload failed");
      }

      const { avatarUrl: newUrl } = await res.json();
      onAvatarChange(newUrl);
      toast.success("Profile photo updated!");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to upload photo. Please try again."
      );
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setRemoving(true);
    try {
      const res = await fetch("/api/user/avatar", { method: "DELETE" });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? "Delete failed");
      }

      onAvatarChange(null);
      toast.success("Profile photo removed.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to remove photo. Please try again."
      );
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="flex items-center gap-5" id="avatar">
      {/* Avatar with hover overlay */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        disabled={uploading}
        className={cn(
          "group relative rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2",
          dragOver && "ring-2 ring-navy-500 ring-offset-2 scale-[1.02]"
        )}
        aria-label="Upload profile photo"
      >
        <UserAvatar
          avatarUrl={avatarUrl}
          firstName={firstName}
          lastName={lastName}
          size="lg"
        />

        {/* Hover overlay */}
        <div className="absolute inset-0 rounded-2xl bg-navy-900/0 group-hover:bg-navy-900/50 transition-colors duration-200 flex flex-col items-center justify-center gap-1">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col items-center gap-1">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
            </svg>
            <span className="text-[11px] font-medium text-white">
              {avatarUrl ? "Change Photo" : "Upload Photo"}
            </span>
          </div>
        </div>

        {/* Upload spinner */}
        {uploading && (
          <div className="absolute inset-0 rounded-2xl bg-white/80 backdrop-blur-sm flex items-center justify-center">
            <div className="h-6 w-6 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          </div>
        )}
      </button>

      {/* Text + actions */}
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-navy-700">Profile Photo</p>
        <p className="text-xs text-slate-400">
          JPEG, PNG, or WebP &middot; Max 5 MB
        </p>
        {avatarUrl && (
          <button
            type="button"
            onClick={handleRemove}
            disabled={removing}
            className="text-xs text-crimson-600 hover:text-crimson-700 font-medium mt-1 self-start transition-colors disabled:opacity-50"
          >
            {removing ? "Removing..." : "Remove photo"}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="sr-only"
      />

      {/* Crop modal */}
      {cropSrc && (
        <AvatarCropModal
          open={!!cropSrc}
          onClose={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc(null);
          }}
          imageSrc={cropSrc}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/components/profile/avatar-upload.tsx
git commit -m "feat: add AvatarUpload widget with drag-drop, crop modal, and remove"
```

---

### Task 8: Integrate avatar into profile page

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/profile-form.tsx`

- [ ] **Step 1: Update ProfileForm to accept avatar props and render AvatarUpload**

In `src/app/dashboard/profile/profile-form.tsx`:

Add to the imports at the top:

```typescript
import { AvatarUpload } from "@/components/profile/avatar-upload";
```

Change the `ProfileFormProps` interface from:

```typescript
interface ProfileFormProps {
  initialData: ProfileInput;
  email: string;
}
```

To:

```typescript
interface ProfileFormProps {
  initialData: ProfileInput;
  email: string;
  avatarUrl: string | null;
}
```

Add avatar state inside the component. After the existing `useState` declarations (after line 18, the `serverError` state), add:

```typescript
const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl);
```

Add the destructured `avatarUrl` prop. Change:

```typescript
export function ProfileForm({ initialData, email }: ProfileFormProps) {
```

To:

```typescript
export function ProfileForm({ initialData, email, avatarUrl }: ProfileFormProps) {
```

Then add `AvatarUpload` at the top of the form. Change the form opening from:

```tsx
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Email (read-only) */}
```

To:

```tsx
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Avatar upload */}
      <div className="pb-5 border-b border-slate-100">
        <AvatarUpload
          avatarUrl={currentAvatarUrl}
          firstName={form.firstName}
          lastName={form.lastName}
          onAvatarChange={setCurrentAvatarUrl}
        />
      </div>

      {/* Email (read-only) */}
```

- [ ] **Step 2: Update the profile page to pass avatarUrl**

In `src/app/dashboard/profile/page.tsx`, change the `ProfileForm` usage from:

```tsx
        <ProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
          }}
          email={profile.email}
        />
```

To:

```tsx
        <ProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
          }}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
        />
```

- [ ] **Step 3: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/app/dashboard/profile/page.tsx src/app/dashboard/profile/profile-form.tsx
git commit -m "feat: integrate avatar upload into profile page"
```

---

### Task 9: Update UserMenu to show avatar image

**Files:**
- Modify: `src/components/layout/user-menu.tsx`

- [ ] **Step 1: Update the UserMenu component**

In `src/components/layout/user-menu.tsx`:

Add the `UserAvatar` import at the top with the other imports:

```typescript
import { UserAvatar } from "@/components/ui/user-avatar";
```

Add `avatarUrl` state. After the existing `isAdmin` state (line 19), add:

```typescript
const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
```

Update the `useEffect` that fetches the profile. Change from:

```typescript
  useEffect(() => {
    if (!user) return;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.role === "admin") setIsAdmin(true);
      })
      .catch(() => {});
  }, [user]);
```

To:

```typescript
  useEffect(() => {
    if (!user) return;
    fetch("/api/user/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.profile?.role === "admin") setIsAdmin(true);
        if (data?.profile?.avatarUrl) setAvatarUrl(data.profile.avatarUrl);
      })
      .catch(() => {});
  }, [user]);
```

Replace the initials span in the trigger button. Change from:

```tsx
          <span className="h-9 w-9 rounded-full bg-navy-600 text-white text-xs font-bold flex items-center justify-center shadow-sm">
            {initials}
          </span>
```

To:

```tsx
          <UserAvatar
            avatarUrl={avatarUrl}
            firstName={user.user_metadata?.first_name ?? ""}
            lastName={user.user_metadata?.last_name ?? ""}
            size="sm"
          />
```

Also update the trigger button's className since the avatar is no longer always round. Change from:

```tsx
        <button
          className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2"
```

To:

```tsx
        <button
          className="flex items-center gap-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 focus:ring-offset-2"
```

Add a "Change Photo" menu item. After the existing `MENU_ITEMS.map` block (after the closing `})`), before the `{isAdmin && (` block, add:

```tsx
          <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />
          <DropdownMenu.Item asChild>
            <Link
              href="/dashboard/profile#avatar"
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700"
            >
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
              Change Photo
            </Link>
          </DropdownMenu.Item>
```

- [ ] **Step 2: Remove the now-unused `initials` variable**

The `initials` variable (line 33) is no longer used in the JSX. Remove this line:

```typescript
  const initials = getInitials(user.user_metadata?.first_name, user.user_metadata?.last_name, user.email);
```

Also remove the `getInitials` function (lines 135-140) since it's no longer called anywhere in this file.

- [ ] **Step 3: Verify type-check passes**

```bash
npx tsc --noEmit
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/user-menu.tsx
git commit -m "feat: show avatar image in header user menu with change photo link"
```

---

### Task 10: Create user-avatars Supabase Storage bucket

**Files:** None (Supabase dashboard or SQL)

This must be done before testing the upload flow. The `user-avatars` bucket needs to exist in Supabase Storage.

- [ ] **Step 1: Create the bucket via Supabase SQL**

Run this in the Supabase SQL Editor (or via the dashboard UI under Storage):

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;
```

- [ ] **Step 2: Add a storage policy for public reads**

```sql
CREATE POLICY "Public read access for user-avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-avatars');
```

Note: Writes go through the admin client (service role key), which bypasses RLS. No write policy needed.

- [ ] **Step 3: Verify the bucket exists**

Go to Supabase Dashboard → Storage. Confirm `user-avatars` bucket appears as public.

---

### Task 11: Manual end-to-end verification

**Files:** None

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to profile page**

Open `http://localhost:3000/dashboard/profile` in the browser. Verify:
- Avatar upload widget appears above the form fields
- Shows initials in a rounded square (navy gradient)
- Hover overlay shows camera icon + "Change Photo"

- [ ] **Step 3: Test upload flow**

1. Click the avatar → file picker opens
2. Select a JPEG/PNG image
3. Crop modal appears with the image
4. Adjust zoom slider, drag to reposition
5. Click "Save Photo"
6. Avatar updates on the profile page
7. Toast shows "Profile photo updated!"

- [ ] **Step 4: Verify header avatar**

Check the top-right user menu icon — it should now show the uploaded image instead of initials.

- [ ] **Step 5: Test dropdown "Change Photo" link**

Open the user menu dropdown. Verify "Change Photo" item appears. Click it — should navigate to `/dashboard/profile#avatar`.

- [ ] **Step 6: Test remove photo**

On the profile page, click "Remove photo" link. Verify:
- Avatar reverts to initials
- Toast shows "Profile photo removed."
- Header icon reverts to initials

- [ ] **Step 7: Test drag and drop**

Drag an image file onto the avatar area. Verify crop modal opens.

- [ ] **Step 8: Test error cases**

1. Try uploading a `.gif` file → toast: "Please upload a JPEG, PNG, or WebP image."
2. Try uploading a file > 5MB → toast: "Image must be under 5MB."

- [ ] **Step 9: Run all tests**

```bash
npm run test:run
```

Expected: All tests pass

- [ ] **Step 10: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: No errors

- [ ] **Step 11: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: address issues found during e2e verification"
```

Only commit if there were fixes. Skip if everything passed clean.
