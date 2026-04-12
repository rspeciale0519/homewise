# Multi-Signature Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Support multiple saved signatures per user (drawn or uploaded PNG), with a picker popover in the document viewer and optional save-to-profile after drawing on a document.

**Architecture:** Migrate `DocumentSignature` from one-to-one to one-to-many. Build a signature picker popover (Radix) in the viewer toolbar. Add PNG upload with transparency detection. Rewrite profile signature section as a multi-card grid.

**Tech Stack:** Next.js App Router, Prisma, Radix UI Popover, Zod, HTML5 Canvas (transparency check), TypeScript

**Spec:** `docs/superpowers/specs/2026-04-12-multi-signature-management-design.md`

---

## File Structure

### New Files
| File | Responsibility |
|------|---------------|
| `src/components/documents/signature-picker.tsx` | Popover in viewer toolbar for selecting/drawing/uploading signatures |
| `src/components/documents/signature-upload.tsx` | PNG file upload with preview and transparency check |
| `src/components/documents/save-signature-prompt.tsx` | Post-draw dialog asking to save signature to profile |
| `src/lib/documents/check-transparency.ts` | Utility: load PNG into canvas, detect transparent pixels |

### Modified Files
| File | Change |
|------|--------|
| `prisma/schema.prisma` | `DocumentSignature`: remove `@unique` on userId, add `label` and `source` fields |
| `src/schemas/document-viewer.schema.ts` | Add `createSignatureSchema`, `updateSignatureSchema` |
| `src/types/document-viewer.ts` | Add `SavedSignature` type |
| `src/app/api/documents/signatures/route.ts` | Rewrite: GET returns array, POST creates, PUT renames, DELETE by id |
| `src/app/dashboard/profile/page.tsx` | Pass signature array to SignatureSection |
| `src/app/dashboard/profile/signature-section.tsx` | Rewrite as multi-signature card grid |
| `src/app/dashboard/documents/viewer/page.tsx` | Pass signature array to PdfViewerShell |
| `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx` | Replace `savedSignature` with `savedSignatures`, add picker/save flows |
| `src/components/documents/viewer-toolbar.tsx` | Add `savedSignatures` prop, render picker popover on signature button |

---

## Task 1: Schema & Validation

**Files:**
- Modify: `prisma/schema.prisma` (lines 993-1001)
- Modify: `src/schemas/document-viewer.schema.ts`
- Modify: `src/types/document-viewer.ts`

- [ ] **Step 1: Update Prisma schema**

In `prisma/schema.prisma`, replace the existing `DocumentSignature` model:

```prisma
model DocumentSignature {
  id        String   @id @default(cuid())
  userId    String
  label     String
  imageData String
  source    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user UserProfile @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

- [ ] **Step 2: Push schema to database**

```bash
source .env.local && export DATABASE_URL DIRECT_DATABASE_URL && npx prisma db push --accept-data-loss
```

Expected: "Your database is now in sync with your Prisma schema."

- [ ] **Step 3: Add Zod schemas**

In `src/schemas/document-viewer.schema.ts`, add after the existing `signatureSchema`:

```typescript
export const createSignatureSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be 50 characters or fewer"),
  imageData: z
    .string()
    .min(1, "Signature data is required")
    .refine(
      (val) => val.startsWith("data:image/png;base64,"),
      "Signature must be a base64 PNG data URL"
    ),
  source: z.enum(["drawn", "uploaded"]),
});

export const updateSignatureSchema = z.object({
  id: z.string().min(1),
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(50, "Label must be 50 characters or fewer"),
});

export const deleteSignatureSchema = z.object({
  id: z.string().min(1),
});
```

- [ ] **Step 4: Add SavedSignature type**

In `src/types/document-viewer.ts`, add:

```typescript
export interface SavedSignature {
  id: string;
  label: string;
  imageData: string;
  source: "drawn" | "uploaded";
}
```

- [ ] **Step 5: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma src/schemas/document-viewer.schema.ts src/types/document-viewer.ts
git commit -m "feat(signatures): migrate schema to one-to-many with label and source"
```

---

## Task 2: API Routes

**Files:**
- Modify: `src/app/api/documents/signatures/route.ts`

- [ ] **Step 1: Rewrite the signatures API**

Replace the entire contents of `src/app/api/documents/signatures/route.ts`:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  createSignatureSchema,
  updateSignatureSchema,
  deleteSignatureSchema,
} from "@/schemas/document-viewer.schema";

const MAX_SIGNATURES = 10;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const signatures = await prisma.documentSignature.findMany({
    where: { userId: user.id },
    select: { id: true, label: true, imageData: true, source: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ signatures });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = createSignatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const count = await prisma.documentSignature.count({
    where: { userId: user.id },
  });

  if (count >= MAX_SIGNATURES) {
    return NextResponse.json(
      { error: `Maximum of ${MAX_SIGNATURES} signatures reached` },
      { status: 409 }
    );
  }

  const sig = await prisma.documentSignature.create({
    data: {
      userId: user.id,
      label: parsed.data.label,
      imageData: parsed.data.imageData,
      source: parsed.data.source,
    },
    select: { id: true, label: true, imageData: true, source: true, createdAt: true },
  });

  return NextResponse.json({ signature: sig }, { status: 201 });
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = updateSignatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.documentSignature.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Signature not found" }, { status: 404 });
  }

  const sig = await prisma.documentSignature.update({
    where: { id: parsed.data.id },
    data: { label: parsed.data.label },
    select: { id: true, label: true, updatedAt: true },
  });

  return NextResponse.json({ signature: sig });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = deleteSignatureSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const existing = await prisma.documentSignature.findFirst({
    where: { id: parsed.data.id, userId: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Signature not found" }, { status: 404 });
  }

  await prisma.documentSignature.delete({ where: { id: parsed.data.id } });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/documents/signatures/route.ts
git commit -m "feat(signatures): rewrite API for multi-signature CRUD with limit"
```

---

## Task 3: Transparency Check Utility

**Files:**
- Create: `src/lib/documents/check-transparency.ts`

- [ ] **Step 1: Create the utility**

```typescript
/**
 * Checks if a base64 PNG image contains any transparent pixels.
 * Returns true if at least one pixel has alpha < 255.
 */
export function checkTransparency(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(false);
        return;
      }
      ctx.drawImage(img, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          resolve(true);
          return;
        }
      }
      resolve(false);
    };
    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/documents/check-transparency.ts
git commit -m "feat(signatures): add PNG transparency detection utility"
```

---

## Task 4: Signature Upload Component

**Files:**
- Create: `src/components/documents/signature-upload.tsx`

- [ ] **Step 1: Create the upload component**

This component handles PNG file selection, preview, transparency warning, and label input.

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { checkTransparency } from "@/lib/documents/check-transparency";

interface SignatureUploadProps {
  onSave: (dataUrl: string, label: string) => void;
  onCancel: () => void;
}

export function SignatureUpload({ onSave, onCancel }: SignatureUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [hasTransparency, setHasTransparency] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith("image/png")) return;

      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        setPreview(dataUrl);
        setChecking(true);
        const transparent = await checkTransparency(dataUrl);
        setHasTransparency(transparent);
        setChecking(false);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!preview || !label.trim()) return;
    onSave(preview, label.trim());
  }, [preview, label, onSave]);

  return (
    <div className="space-y-4">
      {!preview ? (
        <div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:border-navy-300 hover:bg-navy-50/30 transition-all p-8 flex flex-col items-center gap-2"
          >
            <svg
              className="h-8 w-8 text-slate-300"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <span className="text-sm font-medium text-slate-500">
              Select a PNG file
            </span>
            <span className="text-xs text-slate-400">
              Transparent background recommended
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,image/png"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwIiBoZWlnaHQ9IjEwIiBmaWxsPSIjZjFmNWY5Ii8+PHJlY3QgeD0iMTAiIHk9IjEwIiB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiNmMWY1ZjkiLz48L3N2Zz4=')]">
            <Image
              src={preview}
              alt="Signature preview"
              width={300}
              height={120}
              className="max-h-[100px] w-auto object-contain"
              unoptimized
            />
          </div>

          {checking && (
            <p className="text-xs text-slate-400">Checking transparency...</p>
          )}

          {hasTransparency === false && !checking && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2">
              <p className="text-sm text-amber-700">
                This image doesn&apos;t appear to have a transparent background. It may not look right on documents.
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Signature Label <span className="text-crimson-500">*</span>
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder='e.g., "Full Signature", "Initials"'
              maxLength={50}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
            />
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        {preview && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPreview(null);
              setLabel("");
              setHasTransparency(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
            Choose Different File
          </Button>
        )}
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!preview || !label.trim()}
          >
            Save Signature
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/documents/signature-upload.tsx
git commit -m "feat(signatures): add PNG upload component with transparency check"
```

---

## Task 5: Profile Page — Multi-Signature Section

**Files:**
- Modify: `src/app/dashboard/profile/page.tsx`
- Modify: `src/app/dashboard/profile/signature-section.tsx`

- [ ] **Step 1: Update profile page to pass signature array**

Replace the entire contents of `src/app/dashboard/profile/page.tsx`:

```typescript
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { SignatureSection } from "./signature-section";
import type { SavedSignature } from "@/types/document-viewer";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    include: {
      agentProfile: { select: { id: true } },
      documentSignatures: {
        select: { id: true, label: true, imageData: true, source: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!profile) redirect("/dashboard");

  const isAgent = profile.role === "agent" || profile.role === "admin";
  const savedSignatures: SavedSignature[] = (profile.documentSignatures ?? []).map(
    (s) => ({
      id: s.id,
      label: s.label,
      imageData: s.imageData,
      source: s.source as "drawn" | "uploaded",
    })
  );

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8">
        <h1 className="font-serif text-display-sm text-navy-700">Profile</h1>
        <p className="mt-2 text-sm text-slate-500">
          Update your personal information.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
        <ProfileForm
          initialData={{
            firstName: profile.firstName,
            lastName: profile.lastName,
            phone: profile.phone ?? "",
          }}
          email={profile.email}
          avatarUrl={profile.avatarUrl}
        />
      </div>

      {isAgent && (
        <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sm:p-8">
          <SignatureSection initialSignatures={savedSignatures} />
        </div>
      )}
    </div>
  );
}
```

Note: The Prisma relation name changes from `documentSignature` (singular) to `documentSignatures` (plural) because it's now one-to-many. Update the UserProfile model in the schema if needed — the relation field on UserProfile should be `documentSignatures DocumentSignature[]` (plural).

- [ ] **Step 2: Update the Prisma schema relation on UserProfile**

In `prisma/schema.prisma`, in the `UserProfile` model, change:

```prisma
  documentSignature  DocumentSignature?
```

to:

```prisma
  documentSignatures DocumentSignature[]
```

Then regenerate the client:

```bash
npx prisma generate
```

- [ ] **Step 3: Rewrite SignatureSection**

Replace the entire contents of `src/app/dashboard/profile/signature-section.tsx`:

```typescript
"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { SignaturePad } from "@/components/documents/signature-pad";
import { SignatureUpload } from "@/components/documents/signature-upload";
import type { SavedSignature } from "@/types/document-viewer";

const MAX_SIGNATURES = 10;

interface SignatureSectionProps {
  initialSignatures: SavedSignature[];
}

type ViewMode = "list" | "draw" | "upload";

export function SignatureSection({ initialSignatures }: SignatureSectionProps) {
  const [signatures, setSignatures] = useState<SavedSignature[]>(initialSignatures);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pendingDrawnImage, setPendingDrawnImage] = useState<string | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "deleting">("idle");
  const [error, setError] = useState("");

  const atLimit = signatures.length >= MAX_SIGNATURES;

  const handleDrawnSave = useCallback((dataUrl: string) => {
    setPendingDrawnImage(dataUrl);
    setLabelInput("");
  }, []);

  const handleSaveWithLabel = useCallback(
    async (imageData: string, label: string, source: "drawn" | "uploaded") => {
      setStatus("saving");
      setError("");
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, imageData, source }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to save signature");
        }
        const { signature } = await res.json();
        setSignatures((prev) => [...prev, {
          id: signature.id,
          label: signature.label,
          imageData: signature.imageData,
          source: signature.source,
        }]);
        setViewMode("list");
        setPendingDrawnImage(null);
        setLabelInput("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setStatus("idle");
      }
    },
    []
  );

  const handleUploadSave = useCallback(
    (dataUrl: string, label: string) => {
      handleSaveWithLabel(dataUrl, label, "uploaded");
    },
    [handleSaveWithLabel]
  );

  const handleDelete = useCallback(async (id: string) => {
    setStatus("deleting");
    setError("");
    try {
      const res = await fetch("/api/documents/signatures", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Failed to delete signature");
      }
      setSignatures((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setStatus("idle");
    }
  }, []);

  const handleRename = useCallback(
    async (id: string) => {
      if (!editLabel.trim()) return;
      setStatus("saving");
      setError("");
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, label: editLabel.trim() }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error ?? "Failed to rename signature");
        }
        setSignatures((prev) =>
          prev.map((s) => (s.id === id ? { ...s, label: editLabel.trim() } : s))
        );
        setEditingId(null);
        setEditLabel("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setStatus("idle");
      }
    },
    [editLabel]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-navy-700">My Signatures</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {signatures.length} of {MAX_SIGNATURES} signatures saved
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-crimson-50 border border-crimson-200 px-4 py-3">
          <p className="text-sm text-crimson-700">{error}</p>
        </div>
      )}

      {viewMode === "draw" && !pendingDrawnImage && (
        <SignaturePad
          onSave={handleDrawnSave}
          onCancel={() => setViewMode("list")}
        />
      )}

      {viewMode === "draw" && pendingDrawnImage && (
        <div className="space-y-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex items-center justify-center">
            <Image
              src={pendingDrawnImage}
              alt="Drawn signature preview"
              width={300}
              height={120}
              className="max-h-[100px] w-auto object-contain"
              unoptimized
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-700 mb-1">
              Signature Label <span className="text-crimson-500">*</span>
            </label>
            <input
              type="text"
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder='e.g., "Full Signature", "Initials"'
              maxLength={50}
              className="w-full h-10 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent"
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setPendingDrawnImage(null); setViewMode("list"); }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleSaveWithLabel(pendingDrawnImage, labelInput, "drawn")}
              disabled={!labelInput.trim() || status === "saving"}
            >
              {status === "saving" ? "Saving..." : "Save Signature"}
            </Button>
          </div>
        </div>
      )}

      {viewMode === "upload" && (
        <SignatureUpload
          onSave={handleUploadSave}
          onCancel={() => setViewMode("list")}
        />
      )}

      {viewMode === "list" && (
        <>
          {signatures.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm text-slate-400">
                No signatures saved yet. Draw or upload one below.
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {signatures.map((sig) => (
                <div
                  key={sig.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex-shrink-0 w-[120px] h-[48px] rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                    <Image
                      src={sig.imageData}
                      alt={sig.label}
                      width={120}
                      height={48}
                      className="w-full h-full object-contain"
                      unoptimized
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    {editingId === sig.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          maxLength={50}
                          className="flex-1 h-8 px-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleRename(sig.id);
                            if (e.key === "Escape") setEditingId(null);
                          }}
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRename(sig.id)}
                          disabled={!editLabel.trim() || status === "saving"}
                        >
                          Save
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-navy-700 truncate">
                          {sig.label}
                        </p>
                        <span className="flex-shrink-0 text-[10px] uppercase tracking-wider font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {sig.source}
                        </span>
                      </div>
                    )}
                  </div>
                  {editingId !== sig.id && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => { setEditingId(sig.id); setEditLabel(sig.label); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors"
                        title="Rename"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(sig.id)}
                        disabled={status === "deleting"}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 transition-colors"
                        title="Delete"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("draw")}
              disabled={atLimit}
            >
              Draw Signature
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setViewMode("upload")}
              disabled={atLimit}
            >
              Upload PNG
            </Button>
            {atLimit && (
              <span className="text-xs text-slate-400 ml-2">
                Maximum {MAX_SIGNATURES} signatures reached
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/dashboard/profile/page.tsx src/app/dashboard/profile/signature-section.tsx prisma/schema.prisma
git commit -m "feat(signatures): multi-signature profile page with draw and upload"
```

---

## Task 6: Install Radix Popover & Build Signature Picker

**Files:**
- Create: `src/components/documents/signature-picker.tsx`

- [ ] **Step 1: Install Radix Popover**

```bash
npm install @radix-ui/react-popover
```

- [ ] **Step 2: Create the signature picker popover**

```typescript
"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import * as Popover from "@radix-ui/react-popover";
import type { SavedSignature } from "@/types/document-viewer";

interface SignaturePickerProps {
  signatures: SavedSignature[];
  active: boolean;
  onSelectSignature: (imageData: string) => void;
  onDrawNew: () => void;
  onUploadNew: () => void;
  children: React.ReactNode;
}

export function SignaturePicker({
  signatures,
  active,
  onSelectSignature,
  onDrawNew,
  onUploadNew,
  children,
}: SignaturePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleSelect = useCallback(
    (imageData: string) => {
      setOpen(false);
      onSelectSignature(imageData);
    },
    [onSelectSignature]
  );

  const handleDraw = useCallback(() => {
    setOpen(false);
    onDrawNew();
  }, [onDrawNew]);

  const handleUpload = useCallback(() => {
    setOpen(false);
    onUploadNew();
  }, [onUploadNew]);

  // No saved signatures — just render the trigger as-is (no popover)
  if (signatures.length === 0) {
    return <>{children}</>;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild ref={triggerRef}>
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={8}
          className="z-50 w-64 rounded-xl border border-slate-200 bg-white shadow-elevated p-2 animate-in fade-in-0 zoom-in-95"
        >
          <div className="px-2 py-1.5">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Saved Signatures
            </p>
          </div>

          <div className="max-h-[240px] overflow-y-auto">
            {signatures.map((sig) => (
              <button
                key={sig.id}
                onClick={() => handleSelect(sig.imageData)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex-shrink-0 w-[60px] h-[28px] rounded border border-slate-100 bg-white flex items-center justify-center overflow-hidden">
                  <Image
                    src={sig.imageData}
                    alt={sig.label}
                    width={60}
                    height={28}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
                <span className="text-sm text-navy-700 truncate">
                  {sig.label}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              onClick={handleDraw}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
              </svg>
              <span className="text-sm text-navy-700">Draw new signature</span>
            </button>
            <button
              onClick={handleUpload}
              className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <svg className="h-4 w-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <span className="text-sm text-navy-700">Upload PNG</span>
            </button>
          </div>

          <Popover.Arrow className="fill-white" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

- [ ] **Step 3: Run type-check**

```bash
npm run type-check
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json src/components/documents/signature-picker.tsx
git commit -m "feat(signatures): add signature picker popover with Radix"
```

---

## Task 7: Save-Signature Prompt Component

**Files:**
- Create: `src/components/documents/save-signature-prompt.tsx`

- [ ] **Step 1: Create the save prompt dialog**

This appears after drawing a signature directly on a document, asking if the user wants to save it to their profile.

```typescript
"use client";

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";

interface SaveSignaturePromptProps {
  onSave: (label: string) => void;
  onSkip: () => void;
}

export function SaveSignaturePrompt({ onSave, onSkip }: SaveSignaturePromptProps) {
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    if (!label.trim()) return;
    setSaving(true);
    onSave(label.trim());
  }, [label, onSave]);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-slate-200 bg-white shadow-elevated p-4 animate-in slide-in-from-bottom-4 fade-in-0">
      <p className="text-sm font-medium text-navy-700 mb-3">
        Save this signature to your profile?
      </p>
      <input
        type="text"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder='e.g., "Full Signature"'
        maxLength={50}
        className="w-full h-9 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 focus:border-transparent mb-3"
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) handleSave();
        }}
        autoFocus
      />
      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onSkip}>
          Skip
        </Button>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!label.trim() || saving}
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/documents/save-signature-prompt.tsx
git commit -m "feat(signatures): add save-to-profile prompt component"
```

---

## Task 8: Wire Up Viewer Toolbar & Shell

**Files:**
- Modify: `src/components/documents/viewer-toolbar.tsx`
- Modify: `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx`
- Modify: `src/app/dashboard/documents/viewer/page.tsx`

This is the integration task — connecting the picker, save prompt, and updated flows into the existing viewer.

- [ ] **Step 1: Update viewer page to pass signature array**

In `src/app/dashboard/documents/viewer/page.tsx`, update the `getAgentData` function and how `savedSignature` is passed.

Change the return type of `getAgentData` — the `savedSignature` field becomes `savedSignatures` array. In the function body, query `documentSignatures` (plural) from the user profile:

Replace the `getAgentData` function:

```typescript
async function getAgentData(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      email: true,
      documentSignatures: {
        select: { id: true, label: true, imageData: true, source: true },
        orderBy: { createdAt: "asc" },
      },
      agentProfile: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          designations: true,
        },
      },
    },
  });

  if (!profile) return null;

  const agent = profile.agentProfile
    ?? (profile.email
      ? await prisma.agent.findFirst({
          where: { email: profile.email, active: true },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            designations: true,
          },
        })
      : null);

  return {
    ...agent,
    savedSignatures: (profile.documentSignatures ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      imageData: s.imageData,
    })),
  };
}
```

Then update the JSX to pass `savedSignatures` instead of `savedSignature`:

```typescript
  const savedSignatures = agent?.savedSignatures ?? [];

  return (
    <PdfViewerShell
      documentPath={docPath}
      documentName={documentName}
      fileUrl={fileUrl}
      agentInfo={agentInfo}
      savedSignatures={savedSignatures}
    />
  );
```

Also add the `SavedSignature` import at the top if needed for typing.

- [ ] **Step 2: Update ViewerToolbar**

In `src/components/documents/viewer-toolbar.tsx`:

1. Add `savedSignatures` to the props interface:

```typescript
  savedSignatures: Array<{ id: string; label: string; imageData: string }>;
  onSelectSignature: (imageData: string) => void;
  onDrawNewSignature: () => void;
  onUploadSignature: () => void;
```

2. Import and wrap the signature button with `SignaturePicker`:

```typescript
import { SignaturePicker } from "@/components/documents/signature-picker";
```

3. Replace the signature ToolButton (around line 208-216) with:

```typescript
<SignaturePicker
  signatures={savedSignatures.map((s) => ({ ...s, source: "drawn" as const }))}
  active={activeMode === "signature"}
  onSelectSignature={onSelectSignature}
  onDrawNew={onDrawNewSignature}
  onUploadNew={onUploadSignature}
>
  <ToolButton
    active={activeMode === "signature"}
    onClick={savedSignatures.length === 0
      ? () => onSetMode(activeMode === "signature" ? "cursor" : "signature")
      : undefined
    }
    title="Place signature"
  >
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
    </svg>
  </ToolButton>
</SignaturePicker>
```

- [ ] **Step 3: Update PdfViewerShell**

In `src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx`:

1. Update props interface — replace `savedSignature: string | null` with `savedSignatures: Array<{ id: string; label: string; imageData: string }>`.

2. Add new state:

```typescript
const [activeSignatureImage, setActiveSignatureImage] = useState<string | null>(null);
const [showSavePrompt, setShowSavePrompt] = useState<string | null>(null); // holds drawn imageData
const [savedSigs, setSavedSigs] = useState(savedSignatures); // local copy for mutations
```

3. Add new callbacks:

```typescript
const handleSelectSignature = useCallback((imageData: string) => {
  setActiveSignatureImage(imageData);
  setActiveMode("signature");
}, []);

const handleDrawNewSignature = useCallback(() => {
  setActiveSignatureImage(null);
  setActiveMode("signature");
}, []);

const handleUploadSignature = useCallback(() => {
  // Open file picker, save via API, then enter signature mode
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".png,image/png";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const label = prompt("Enter a label for this signature:");
      if (!label?.trim()) return;
      try {
        const res = await fetch("/api/documents/signatures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label: label.trim(), imageData: dataUrl, source: "uploaded" }),
        });
        if (!res.ok) throw new Error("Failed to save");
        const { signature } = await res.json();
        setSavedSigs((prev) => [...prev, { id: signature.id, label: signature.label, imageData: signature.imageData }]);
        setActiveSignatureImage(dataUrl);
        setActiveMode("signature");
      } catch { /* toast error */ }
    };
    reader.readAsDataURL(file);
  };
  input.click();
}, []);
```

4. Update `handlePlaceAnnotation` — replace the signature branch:

```typescript
} else if (activeMode === "signature") {
  const sigWidth = 150;
  const sigHeight = 60;
  if (activeSignatureImage) {
    // Placing a selected saved signature
    setAnnotations((prev) => [
      ...prev,
      {
        id: genId(),
        pageIndex,
        pdfX: pdfX - sigWidth / 2,
        pdfY: pdfY - sigHeight / 2,
        type: "signature",
        value: activeSignatureImage,
        fontSize: 12,
        color: "#000000",
        width: sigWidth,
        height: sigHeight,
      },
    ]);
    setActiveMode("cursor");
    setActiveSignatureImage(null);
  } else {
    // No saved signature selected — draw new
    setPendingPlacement({ pageIndex, pdfX, pdfY });
    setShowSignaturePad(true);
  }
```

5. Update `handleSignatureSave` to show the save prompt after placing:

```typescript
const handleSignatureSave = useCallback(
  (dataUrl: string) => {
    if (pendingPlacement) {
      const sigWidth = 150;
      const sigHeight = 60;
      setAnnotations((prev) => [
        ...prev,
        {
          id: genId(),
          pageIndex: pendingPlacement.pageIndex,
          pdfX: pendingPlacement.pdfX - sigWidth / 2,
          pdfY: pendingPlacement.pdfY - sigHeight / 2,
          type: "signature",
          value: dataUrl,
          fontSize: 12,
          color: "#000000",
          width: sigWidth,
          height: sigHeight,
        },
      ]);
      setPendingPlacement(null);
    }
    setShowSignaturePad(false);
    setActiveMode("cursor");
    // Show save-to-profile prompt
    setShowSavePrompt(dataUrl);
  },
  [pendingPlacement]
);
```

6. Add save prompt handlers:

```typescript
const handleSaveToProfile = useCallback(
  async (label: string) => {
    if (!showSavePrompt) return;
    try {
      const res = await fetch("/api/documents/signatures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, imageData: showSavePrompt, source: "drawn" }),
      });
      if (res.ok) {
        const { signature } = await res.json();
        setSavedSigs((prev) => [...prev, { id: signature.id, label: signature.label, imageData: signature.imageData }]);
      }
    } catch { /* silent */ }
    setShowSavePrompt(null);
  },
  [showSavePrompt]
);

const handleSkipSavePrompt = useCallback(() => {
  setShowSavePrompt(null);
}, []);
```

7. Pass new props to `ViewerToolbar`:

```typescript
savedSignatures={savedSigs}
onSelectSignature={handleSelectSignature}
onDrawNewSignature={handleDrawNewSignature}
onUploadSignature={handleUploadSignature}
```

8. Add the save prompt to the JSX (after the email dialog):

```typescript
import { SaveSignaturePrompt } from "@/components/documents/save-signature-prompt";

{showSavePrompt && (
  <SaveSignaturePrompt
    onSave={handleSaveToProfile}
    onSkip={handleSkipSavePrompt}
  />
)}
```

- [ ] **Step 4: Run type-check and lint**

```bash
npm run type-check && npm run lint
```

Fix any errors.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 6: Commit**

```bash
git add src/app/dashboard/documents/viewer/page.tsx src/app/dashboard/documents/viewer/pdf-viewer-shell.tsx src/components/documents/viewer-toolbar.tsx
git commit -m "feat(signatures): integrate picker, save prompt, and multi-signature flows in viewer"
```

---

## Task 9: Final Verification

- [ ] **Step 1: Run full verification suite**

```bash
npm run type-check && npm run lint && npm run test:run && npm run build
```

Expected: All pass.

- [ ] **Step 2: Push and verify Vercel deployment**

```bash
git push origin develop
```

Monitor Vercel build until READY.

- [ ] **Step 3: Test end-to-end in browser**

Test these flows:
1. Profile page: Draw a signature with label → appears in grid
2. Profile page: Upload a PNG with label → transparency check → appears in grid
3. Profile page: Rename a signature → label updates
4. Profile page: Delete a signature → removed from grid
5. Profile page: Try to add 11th signature → disabled buttons
6. Viewer: Click signature tool with saved signatures → popover appears
7. Viewer: Select a saved signature → click document → placed immediately
8. Viewer: Draw new from popover → draw on document → save prompt appears → save with label
9. Viewer: Draw new → skip save prompt → signature only on document
10. Viewer: Click signature tool with no saved signatures → enters draw mode directly
