# Admin Bulk Upload — Document Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let an admin bulk-upload many documents (drag/drop or picker) into the Document Library; uploads land **uncategorized** and **unpublished** for later triage via the organize board.

**Architecture:** Reuse the existing per-file signed-URL upload route unchanged; add a dedicated `bulk-create` route that creates `published:false` documents with **no category memberships** (uncategorized = zero memberships, Approach A — no schema change). Extend the admin organize tree with an optional `uncategorized` set surfaced as a 4th "Uncategorized (n)" tab. A new dialog orchestrates validation + concurrent uploads + bulk-create.

**Tech Stack:** Next.js App Router route handlers, Prisma (PostgreSQL), Zod, Supabase Storage signed upload URLs, Radix Dialog, Vitest + @testing-library/react (`fireEvent`; **no** `@testing-library/user-event`).

**Spec:** `docs/superpowers/specs/2026-05-19-bulk-upload-documents-design.md`

**Pre-flight:** Branch `feature/bulk-upload` is already checked out (off `develop`). Do not switch branches. Project rules: TS strict / no `any` / no explanatory comments (the one `// eslint-disable-next-line react-hooks/set-state-in-effect -- …` directive is allowed — it mirrors the shipped `confirm-dialog.tsx`). Source files ≤ 450 **code lines** (non-blank/non-comment). Commit only the files each task names (the repo has unrelated untracked PDFs — never `git add -A` at repo root).

---

## File Structure

**Create**
- `src/lib/documents/bulk-upload.ts` (+ `.test.ts`) — constants, `nameFromFilename`, `validateFile`, `runWithConcurrency`, `xhrPut`, shared types.
- `src/app/api/admin/documents/bulk-create/route.ts` (+ `route.test.ts`).
- `src/app/admin/documents/uncategorized-list.tsx` (+ `.test.tsx`) — pure list (rows: Categorize, Delete).
- `src/app/admin/documents/bulk-upload-dialog.tsx` (+ `.test.tsx`).
- `src/app/admin/documents/use-uncategorized-actions.ts` (+ `.test.ts`) — hook holding the edit + post-upload handlers (keeps `organize-view.tsx` under the LOC limit).
- `src/components/admin/documents-organize/section-tabs.tsx` (+ `.test.tsx`) — extracted tab bar.

**Modify**
- `src/app/admin/documents/types.ts` — add `OrganizeTab`, `AdminUncategorizedDoc`; extend `OrganizeTree` with **optional** `uncategorized?`.
- `src/lib/documents-organize/shapers.ts` — add `uncategorizedToDocumentItem`.
- `src/app/api/admin/documents/organize/route.ts` (+ `route.test.ts`) — return `uncategorized`.
- `src/lib/documents-organize/use-organize-url-state.ts` — `OrganizeTab` tab support.
- `src/components/admin/documents-organize/use-organize-drag-end.ts` — widen `activeTab` to `OrganizeTab` + early-out on the uncategorized tab.
- `src/components/admin/documents-organize/organize-toolbar.tsx` (+ test) — Bulk upload button.
- `src/app/admin/documents/organize-view.tsx` — wire the 4th tab, dialog, hook; extract the tab bar to `SectionTabs`.

**Reuse unchanged:** `src/app/api/admin/documents/upload/route.ts`, `src/components/admin/document-drawer`, `src/components/admin/confirm-dialog`.

---

## Task 1: Pure bulk-upload lib

**Files:** Create `src/lib/documents/bulk-upload.ts`; Test `src/lib/documents/bulk-upload.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/lib/documents/bulk-upload.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  MAX_BATCH,
  MAX_FILE_BYTES,
  UPLOAD_CONCURRENCY,
  nameFromFilename,
  validateFile,
  runWithConcurrency,
} from "./bulk-upload";

describe("constants", () => {
  it("are the agreed values", () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_BATCH).toBe(50);
    expect(UPLOAD_CONCURRENCY).toBe(4);
  });
});

describe("nameFromFilename", () => {
  it("strips the last extension", () => {
    expect(nameFromFilename("Lease Agreement.pdf")).toBe("Lease Agreement");
  });
  it("keeps inner dots", () => {
    expect(nameFromFilename("report.final.docx")).toBe("report.final");
  });
  it("handles no extension", () => {
    expect(nameFromFilename("README")).toBe("README");
  });
  it("falls back to Untitled when empty", () => {
    expect(nameFromFilename("   ")).toBe("Untitled");
    expect(nameFromFilename(".pdf")).toBe("Untitled");
  });
});

describe("validateFile", () => {
  it("accepts an allowed type within size", () => {
    expect(
      validateFile({ name: "a.pdf", type: "application/pdf", size: 1000 }),
    ).toEqual({ ok: true });
  });
  it("rejects an unsupported extension", () => {
    expect(
      validateFile({ name: "a.exe", type: "application/pdf", size: 1 }).ok,
    ).toBe(false);
  });
  it("rejects an unsupported content type", () => {
    expect(
      validateFile({ name: "a.pdf", type: "text/x-evil", size: 1 }).ok,
    ).toBe(false);
  });
  it("rejects an oversized file", () => {
    expect(
      validateFile({
        name: "a.pdf",
        type: "application/pdf",
        size: MAX_FILE_BYTES + 1,
      }),
    ).toEqual({ ok: false, reason: "File exceeds 25 MB" });
  });
});

describe("runWithConcurrency", () => {
  it("runs all workers, caps concurrency, preserves order", async () => {
    let active = 0;
    let maxActive = 0;
    const work = async (n: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return n * 2;
    };
    const out = await runWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, work);
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(maxActive).toBeLessThanOrEqual(3);
  });
  it("propagates a worker rejection (callers wrap workers to isolate)", async () => {
    const out = await runWithConcurrency([1, 2, 3], 2, async (n) => {
      if (n === 2) throw new Error("boom");
      return n;
    }).catch(() => "THREW");
    expect(out).toBe("THREW");
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/documents/bulk-upload.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/lib/documents/bulk-upload.ts`:

```ts
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_BATCH = 50;
export const UPLOAD_CONCURRENCY = 4;

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".xlsx",
  ".xls",
  ".docx",
  ".doc",
  ".png",
  ".jpg",
  ".jpeg",
] as const;

export const ALLOWED_CONTENT_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "image/png",
  "image/jpeg",
] as const;

export interface BulkUploadItem {
  name: string;
  storageKey: string;
  storageProvider: "supabase";
  mimeType: string | null;
  sizeBytes: number | null;
}

export interface BulkCreateResult {
  created: Array<{ id: string; name: string; slug: string }>;
  failed: Array<{ name: string; error: string }>;
}

export type FileValidation = { ok: true } | { ok: false; reason: string };

export function nameFromFilename(filename: string): string {
  const trimmed = filename.trim();
  const lastDot = trimmed.lastIndexOf(".");
  const base = lastDot > 0 ? trimmed.slice(0, lastDot) : trimmed;
  const cleaned = base.trim();
  return cleaned.length > 0 ? cleaned : "Untitled";
}

function extensionOf(filename: string): string {
  const lastDot = filename.lastIndexOf(".");
  return lastDot === -1 ? "" : filename.slice(lastDot).toLowerCase();
}

export function validateFile(file: {
  name: string;
  type: string;
  size: number;
}): FileValidation {
  if (
    !(ALLOWED_EXTENSIONS as readonly string[]).includes(extensionOf(file.name))
  ) {
    return { ok: false, reason: "Unsupported file type" };
  }
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, reason: "Unsupported file type" };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, reason: "File exceeds 25 MB" };
  }
  return { ok: true };
}

export async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function lane(): Promise<void> {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  const lanes = Array.from(
    { length: Math.min(limit, items.length) },
    () => lane(),
  );
  await Promise.all(lanes);
  return results;
}

export function xhrPut(
  url: string,
  body: Blob,
  opts: { onProgress?: (pct: number) => void; signal?: AbortSignal },
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && opts.onProgress) {
        opts.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed (${xhr.status})`));
    xhr.onerror = () => reject(new Error("Upload failed (network)"));
    xhr.onabort = () => reject(new Error("Upload cancelled"));
    if (opts.signal) {
      if (opts.signal.aborted) {
        xhr.abort();
      } else {
        opts.signal.addEventListener("abort", () => xhr.abort());
      }
    }
    xhr.send(body);
  });
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/documents/bulk-upload.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/documents/bulk-upload.ts src/lib/documents/bulk-upload.test.ts
git commit -m "feat(documents): bulk-upload pure helpers"
```

---

## Task 2: `POST /api/admin/documents/bulk-create`

**Files:** Create `src/app/api/admin/documents/bulk-create/route.ts`; Test `…/route.test.ts`

- [ ] **Step 1: Write the failing test** — create `src/app/api/admin/documents/bulk-create/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { requireAdminApiMock, documentCreateMock, generateUniqueSlugMock } =
  vi.hoisted(() => ({
    requireAdminApiMock: vi.fn(),
    documentCreateMock: vi.fn(),
    generateUniqueSlugMock: vi.fn(),
  }));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { document: { create: documentCreateMock } },
}));
vi.mock("@/lib/slug/slugify", () => ({
  slugify: (s: string) => s.toLowerCase().replace(/\s+/g, "-"),
  generateUniqueSlug: generateUniqueSlugMock,
}));
vi.mock("@/lib/slug/resolve", () => ({ isSlugTakenForDocument: vi.fn() }));

import { POST } from "@/app/api/admin/documents/bulk-create/route";

function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/documents/bulk-create", {
    method: "POST",
    body: JSON.stringify(body),
  });
}
const item = (name: string) => ({
  name,
  storageKey: `documents/k-${name}`,
  storageProvider: "supabase" as const,
  mimeType: "application/pdf",
  sizeBytes: 100,
});

describe("POST /api/admin/documents/bulk-create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    generateUniqueSlugMock.mockImplementation(async (s: string) => s);
    documentCreateMock.mockImplementation(
      async ({ data }: { data: { name: string; slug: string } }) => ({
        id: `id-${data.name}`,
        name: data.name,
        slug: data.slug,
      }),
    );
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await POST(postReq({ items: [item("a")] }));
    expect(res.status).toBe(403);
    expect(documentCreateMock).not.toHaveBeenCalled();
  });

  it("400 on empty items", async () => {
    expect((await POST(postReq({ items: [] }))).status).toBe(400);
  });

  it("400 on more than 50 items", async () => {
    const res = await POST(
      postReq({ items: Array.from({ length: 51 }, (_, i) => item(`f${i}`)) }),
    );
    expect(res.status).toBe(400);
  });

  it("creates each as published:false with no categories", async () => {
    const res = await POST(postReq({ items: [item("a"), item("b")] }));
    expect(res.status).toBe(200);
    expect(documentCreateMock).toHaveBeenCalledTimes(2);
    const first = documentCreateMock.mock.calls[0][0];
    expect(first.data.published).toBe(false);
    expect(first.data.categories).toBeUndefined();
    expect(first.data.storageProvider).toBe("supabase");
    expect(await res.json()).toEqual({
      created: [
        { id: "id-a", name: "a", slug: "a" },
        { id: "id-b", name: "b", slug: "b" },
      ],
      failed: [],
    });
  });

  it("records per-item failures without aborting the batch", async () => {
    documentCreateMock
      .mockImplementationOnce(async () => {
        throw new Error("dupe slug");
      })
      .mockImplementationOnce(
        async ({ data }: { data: { name: string; slug: string } }) => ({
          id: "id-b",
          name: data.name,
          slug: data.slug,
        }),
      );
    const res = await POST(postReq({ items: [item("a"), item("b")] }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      created: [{ id: "id-b", name: "b", slug: "b" }],
      failed: [{ name: "a", error: "dupe slug" }],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/app/api/admin/documents/bulk-create/route.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/app/api/admin/documents/bulk-create/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { generateUniqueSlug, slugify } from "@/lib/slug/slugify";
import { isSlugTakenForDocument } from "@/lib/slug/resolve";

const bulkCreateSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().min(1),
        storageKey: z.string().min(1),
        storageProvider: z.literal("supabase"),
        mimeType: z.string().optional().nullable(),
        sizeBytes: z.number().int().nonnegative().optional().nullable(),
      }),
    )
    .min(1)
    .max(50),
});

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = bulkCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const created: Array<{ id: string; name: string; slug: string }> = [];
  const failed: Array<{ name: string; error: string }> = [];

  for (const item of parsed.data.items) {
    try {
      const slug = await generateUniqueSlug(
        slugify(item.name),
        isSlugTakenForDocument,
      );
      const doc = await prisma.document.create({
        data: {
          slug,
          name: item.name,
          storageProvider: "supabase",
          storageKey: item.storageKey,
          mimeType: item.mimeType ?? null,
          sizeBytes: item.sizeBytes ?? null,
          published: false,
        },
      });
      created.push({ id: doc.id, name: doc.name, slug: doc.slug });
    } catch (e) {
      failed.push({ name: item.name, error: (e as Error).message });
    }
  }

  return NextResponse.json({ created, failed });
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/app/api/admin/documents/bulk-create/route.test.ts` → PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/documents/bulk-create/route.ts src/app/api/admin/documents/bulk-create/route.test.ts
git commit -m "feat(documents): bulk-create endpoint (uncategorized, unpublished)"
```

---

## Task 3: Types — `OrganizeTab`, `AdminUncategorizedDoc`, optional `uncategorized`

**Files:** Modify `src/app/admin/documents/types.ts`

- [ ] **Step 1: Read the file.** Confirm it ends with the `OrganizeTree` interface (only `sections`).

- [ ] **Step 2: Replace the `OrganizeTree` interface** with:

```ts
export type OrganizeTab = DocumentSection | "uncategorized";

export interface AdminUncategorizedDoc {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  published: boolean;
  external: boolean;
  url: string | null;
  storageKey: string | null;
  storageProvider: string;
  mimeType: string | null;
}

export interface OrganizeTree {
  sections: {
    office: { categories: AdminCategoryTree[] };
    listing: { categories: AdminCategoryTree[] };
    sales: { categories: AdminCategoryTree[] };
  };
  uncategorized?: AdminUncategorizedDoc[];
}
```

`uncategorized` is **optional** on purpose: it keeps every existing `{ sections }` constructor (`reorder.ts` `computeCrossCategoryMove`, `use-organize-drag-end.ts` `setTree`, reorder test fixtures, `organize-view` optimistic `setTree`) valid with zero changes. The route always returns it; consumers read `tree.uncategorized ?? []`.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: **0 new errors** (optional field breaks nothing).

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/documents/types.ts
git commit -m "feat(documents): organize types for uncategorized tab"
```

---

## Task 4: Organize route returns `uncategorized`

**Files:** Modify `src/app/api/admin/documents/organize/route.ts`, `…/route.test.ts`

- [ ] **Step 1: Read both files.** The route builds `{ sections }` from `prisma.documentCategory.findMany`. The test mocks `prisma.documentCategory.findMany` and uses only targeted assertions (`toHaveLength`, indexed `.documents`) — there is **no whole-tree `toEqual`**, so only a new test is added (no existing assertion to amend).

- [ ] **Step 2: Add a failing test.** In `organize/route.test.ts`: add `documentFindManyMock` to the `vi.hoisted` block + destructuring; extend the `vi.mock("@/lib/prisma")` factory `prisma` object with `document: { findMany: documentFindManyMock }`; in `beforeEach` add `documentFindManyMock.mockResolvedValue([])`; add:

```ts
it("returns uncategorized documents (zero memberships)", async () => {
  documentFindManyMock.mockResolvedValue([
    {
      id: "u1",
      slug: "u1",
      name: "Loose Doc",
      description: null,
      published: false,
      external: false,
      url: null,
      storageKey: "documents/k-u1",
      storageProvider: "supabase",
      mimeType: "application/pdf",
    },
  ]);
  const res = await GET();
  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.uncategorized).toEqual([
    {
      id: "u1",
      slug: "u1",
      name: "Loose Doc",
      description: null,
      published: false,
      external: false,
      url: null,
      storageKey: "documents/k-u1",
      storageProvider: "supabase",
      mimeType: "application/pdf",
    },
  ]);
  expect(documentFindManyMock).toHaveBeenCalledWith({
    where: { categories: { none: {} } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      published: true,
      external: true,
      url: true,
      storageKey: true,
      storageProvider: true,
      mimeType: true,
    },
  });
});
```

- [ ] **Step 3: Run test to verify it fails** — `npx vitest run src/app/api/admin/documents/organize/route.test.ts` → FAIL (`body.uncategorized` undefined).

- [ ] **Step 4: Implement.** In `organize/route.ts` add `AdminUncategorizedDoc` to the existing `@/app/admin/documents/types` type import; before building `tree` add:

```ts
  const uncategorized = (await prisma.document.findMany({
    where: { categories: { none: {} } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      published: true,
      external: true,
      url: true,
      storageKey: true,
      storageProvider: true,
      mimeType: true,
    },
  })) as AdminUncategorizedDoc[];
```

and add `uncategorized,` as the last property of the `tree` object literal (after `sections: …`).

- [ ] **Step 5: Verify** — `npx vitest run src/app/api/admin/documents/organize/route.test.ts` → PASS; `npx tsc --noEmit -p tsconfig.json` → 0 errors for these files.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/admin/documents/organize/route.ts src/app/api/admin/documents/organize/route.test.ts
git commit -m "feat(documents): organize route returns uncategorized set"
```

---

## Task 5: `OrganizeTab` in URL state

**Files:** Modify `src/lib/documents-organize/use-organize-url-state.ts`

- [ ] **Step 1: Read the file.** Five edit sites: the `DocumentSection` type import, `VALID_TABS`, `isValidTab` return type, the `activeTab` annotation, and the `setActiveTab` param type.

- [ ] **Step 2: Edit.** Replace `import type { DocumentSection } from "@/app/admin/documents/types";` with `import type { OrganizeTab } from "@/app/admin/documents/types";`. Replace `VALID_TABS`:

```ts
const VALID_TABS: ReadonlyArray<OrganizeTab> = [
  "office",
  "listing",
  "sales",
  "uncategorized",
];
```

Change `function isValidTab(value: string | null): value is DocumentSection` → `value is OrganizeTab`; `const activeTab: DocumentSection` → `const activeTab: OrganizeTab`; `setActiveTab = useCallback((next: DocumentSection) =>` → `(next: OrganizeTab) =>`. Keep the `"office"` fallback.

- [ ] **Step 3: Type-check.** `npx tsc --noEmit -p tsconfig.json` → new errors expected **only** in `use-organize-drag-end.ts` and `organize-view.tsx` (fixed in Tasks 6 & 12). No others.

- [ ] **Step 4: Commit**

```bash
git add src/lib/documents-organize/use-organize-url-state.ts
git commit -m "feat(documents): allow uncategorized tab in organize url state"
```

---

## Task 6: `use-organize-drag-end.ts` accepts `OrganizeTab`

**Files:** Modify `src/components/admin/documents-organize/use-organize-drag-end.ts`

- [ ] **Step 1: Read the file.** `UseOrganizeDragEndArgs.activeTab: DocumentSection` (line ~32). The returned callback starts `if (!tree) return;` (line ~49) and then uses `tree.sections[activeTab]` (lines ~64/106/120/143) and `reorderCategories(activeTab, …)` (line ~78).

- [ ] **Step 2: Edit (two changes).**
  1. Add `OrganizeTab` to the `@/app/admin/documents/types` type import and change the field: `activeTab: DocumentSection;` → `activeTab: OrganizeTab;` (keep the existing `DocumentSection`/`OrganizeTree` imports as needed).
  2. Change the callback's first guard from `if (!tree) return;` to:

```ts
      if (!tree || activeTab === "uncategorized") return;
```

After this guard, TypeScript narrows `activeTab` to `DocumentSection` for the rest of the callback, so `tree.sections[activeTab]` and `reorderCategories(activeTab, …)` type-check unchanged. The guard is also correct at runtime: the DnD provider is not rendered on the uncategorized tab (Task 12), so this callback can only fire for real sections anyway.

- [ ] **Step 3: Verify** — `npx tsc --noEmit -p tsconfig.json` (no new errors except `organize-view.tsx`, fixed in Task 12); `npx vitest run src/lib/documents-organize/reorder.test.ts` → still PASS (unchanged behavior).

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/documents-organize/use-organize-drag-end.ts
git commit -m "fix(documents): drag-end hook accepts OrganizeTab, skips uncategorized"
```

---

## Task 7: `uncategorizedToDocumentItem` shaper

**Files:** Modify `src/lib/documents-organize/shapers.ts`; Test `src/lib/documents-organize/shapers.test.ts` (create)

- [ ] **Step 1: Write the failing test** — create `src/lib/documents-organize/shapers.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { uncategorizedToDocumentItem } from "./shapers";
import type { AdminUncategorizedDoc } from "@/app/admin/documents/types";

const doc: AdminUncategorizedDoc = {
  id: "u1",
  slug: "loose-doc",
  name: "Loose Doc",
  description: "d",
  published: false,
  external: false,
  url: null,
  storageKey: "documents/k-u1",
  storageProvider: "supabase",
  mimeType: "application/pdf",
};

describe("uncategorizedToDocumentItem", () => {
  it("maps an uncategorized doc to an empty-category DocumentItem", () => {
    expect(uncategorizedToDocumentItem(doc)).toEqual({
      id: "u1",
      slug: "loose-doc",
      name: "Loose Doc",
      description: "d",
      url: null,
      external: false,
      storageKey: "documents/k-u1",
      storageProvider: "supabase",
      mimeType: "application/pdf",
      sizeBytes: null,
      sortOrder: 0,
      published: false,
      quickAccess: false,
      createdAt: "",
      updatedAt: "",
      categories: [],
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/lib/documents-organize/shapers.test.ts` → FAIL (export missing).

- [ ] **Step 3: Implement.** In `shapers.ts` add `AdminUncategorizedDoc` to the existing `@/app/admin/documents/types` type import and append:

```ts
export function uncategorizedToDocumentItem(
  doc: AdminUncategorizedDoc,
): DocumentItem {
  return {
    id: doc.id,
    slug: doc.slug,
    name: doc.name,
    description: doc.description,
    url: doc.url,
    external: doc.external,
    storageKey: doc.storageKey,
    storageProvider: doc.storageProvider,
    mimeType: doc.mimeType,
    sizeBytes: null,
    sortOrder: 0,
    published: doc.published,
    quickAccess: false,
    createdAt: "",
    updatedAt: "",
    categories: [],
  };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/lib/documents-organize/shapers.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/documents-organize/shapers.ts src/lib/documents-organize/shapers.test.ts
git commit -m "feat(documents): shaper for uncategorized -> DocumentItem"
```

---

## Task 8: `UncategorizedList` component (Categorize + Delete only)

**Files:** Create `src/app/admin/documents/uncategorized-list.tsx`; Test `…/uncategorized-list.test.tsx`

> **Design note (Phase-1 fix B4):** no "Open" action — the in-app viewer and the by-slug file API both reject `published:false` docs, and *every* uncategorized doc is unpublished, so an "Open" button could never work here. The workflow is **Categorize** (drawer) then publish later under the section tab.

- [ ] **Step 1: Write the failing test** — create `src/app/admin/documents/uncategorized-list.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { UncategorizedList } from "./uncategorized-list";
import type { AdminUncategorizedDoc } from "./types";

const doc: AdminUncategorizedDoc = {
  id: "u1",
  slug: "loose-doc",
  name: "Loose Doc",
  description: null,
  published: false,
  external: false,
  url: null,
  storageKey: "documents/k-u1",
  storageProvider: "supabase",
  mimeType: "application/pdf",
};

function setup(over: Partial<Parameters<typeof UncategorizedList>[0]> = {}) {
  const onEdit = vi.fn();
  const onDelete = vi.fn();
  render(
    <UncategorizedList docs={[doc]} onEdit={onEdit} onDelete={onDelete} {...over} />,
  );
  return { onEdit, onDelete };
}

describe("UncategorizedList", () => {
  it("shows an empty state when there are no docs", () => {
    setup({ docs: [] });
    expect(screen.getByText(/nothing uncategorized/i)).toBeInTheDocument();
  });
  it("lists each document name", () => {
    setup();
    expect(screen.getByText("Loose Doc")).toBeInTheDocument();
  });
  it("fires onEdit and onDelete", () => {
    const { onEdit, onDelete } = setup();
    fireEvent.click(screen.getByRole("button", { name: /categorize/i }));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(onEdit).toHaveBeenCalledWith(doc);
    expect(onDelete).toHaveBeenCalledWith(doc);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/app/admin/documents/uncategorized-list.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/app/admin/documents/uncategorized-list.tsx`:

```tsx
"use client";

import { FileText, FolderInput, Trash2 } from "lucide-react";
import type { AdminUncategorizedDoc } from "./types";

interface UncategorizedListProps {
  docs: AdminUncategorizedDoc[];
  onEdit: (doc: AdminUncategorizedDoc) => void;
  onDelete: (doc: AdminUncategorizedDoc) => void;
}

export function UncategorizedList({
  docs,
  onEdit,
  onDelete,
}: UncategorizedListProps) {
  if (docs.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        Nothing uncategorized. Bulk-uploaded documents land here for sorting.
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 bg-white">
      {docs.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3 px-4 py-3">
          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-navy-700 truncate">
              {doc.name}
            </p>
            <p className="text-xs text-slate-400 truncate">{doc.slug}</p>
          </div>
          <button
            type="button"
            onClick={() => onEdit(doc)}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-navy-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          >
            <FolderInput className="h-3.5 w-3.5" />
            Categorize
          </button>
          <button
            type="button"
            aria-label={`Delete ${doc.name}`}
            onClick={() => onDelete(doc)}
            className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 rounded-lg hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/app/admin/documents/uncategorized-list.test.tsx` → PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/uncategorized-list.tsx src/app/admin/documents/uncategorized-list.test.tsx
git commit -m "feat(documents): uncategorized list component"
```

---

## Task 9: Bulk upload dialog

**Files:** Create `src/app/admin/documents/bulk-upload-dialog.tsx`; Test `…/bulk-upload-dialog.test.tsx`

- [ ] **Step 1: Write the failing test** — create `src/app/admin/documents/bulk-upload-dialog.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const adminFetchMock = vi.hoisted(() => vi.fn());
const xhrPutMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: adminFetchMock,
  AdminFetchError: class extends Error {
    status: number;
    constructor(m: string, s: number) {
      super(m);
      this.status = s;
    }
  },
}));
vi.mock("@/lib/documents/bulk-upload", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/documents/bulk-upload")>();
  return { ...actual, xhrPut: xhrPutMock };
});

import { BulkUploadDialog } from "./bulk-upload-dialog";

function pdf(name: string, size = 100): File {
  return new File([new Uint8Array(size)], name, { type: "application/pdf" });
}
function drop(files: File[]) {
  const input = screen.getByTestId("bulk-upload-input") as HTMLInputElement;
  fireEvent.change(input, { target: { files } });
}

describe("BulkUploadDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    xhrPutMock.mockResolvedValue(undefined);
    adminFetchMock.mockImplementation((url: string) =>
      url.endsWith("/upload")
        ? Promise.resolve({
            uploadUrl: "https://signed",
            storageKey: "documents/k",
            storageProvider: "supabase",
          })
        : Promise.resolve({
            created: [{ id: "1", name: "a", slug: "a" }],
            failed: [],
          }),
    );
  });

  it("excludes invalid files with a reason and disables Upload", () => {
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([new File(["x"], "bad.exe", { type: "application/pdf" })]);
    expect(screen.getByText(/unsupported file type/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^upload/i })).toBeDisabled();
  });

  it("uploads valid files then calls onUploaded", async () => {
    const onUploaded = vi.fn();
    render(
      <BulkUploadDialog open onClose={() => {}} onUploaded={onUploaded} />,
    );
    drop([pdf("a.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: /^upload/i }));
    await waitFor(() =>
      expect(onUploaded).toHaveBeenCalledWith({
        created: [{ id: "1", name: "a", slug: "a" }],
        failed: [],
      }),
    );
    expect(xhrPutMock).toHaveBeenCalledTimes(1);
  });

  it("lets you remove a queued file", () => {
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([pdf("a.pdf")]);
    expect(screen.getByDisplayValue("a")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /remove a\.pdf/i }));
    expect(screen.queryByDisplayValue("a")).not.toBeInTheDocument();
  });

  it("marks a file failed and offers Retry when its upload fails", async () => {
    xhrPutMock.mockRejectedValueOnce(new Error("Upload failed (500)"));
    render(<BulkUploadDialog open onClose={() => {}} onUploaded={() => {}} />);
    drop([pdf("a.pdf")]);
    fireEvent.click(screen.getByRole("button", { name: /^upload/i }));
    await waitFor(() =>
      expect(screen.getByText(/upload failed/i)).toBeInTheDocument(),
    );
    expect(
      screen.getByRole("button", { name: /retry failed/i }),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/app/admin/documents/bulk-upload-dialog.test.tsx` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/app/admin/documents/bulk-upload-dialog.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { UploadCloud, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import {
  MAX_BATCH,
  UPLOAD_CONCURRENCY,
  ALLOWED_EXTENSIONS,
  nameFromFilename,
  validateFile,
  runWithConcurrency,
  xhrPut,
  type BulkCreateResult,
  type BulkUploadItem,
} from "@/lib/documents/bulk-upload";

type RowStatus =
  | { kind: "queued" }
  | { kind: "invalid"; reason: string }
  | { kind: "uploading"; pct: number }
  | { kind: "done" }
  | { kind: "error"; reason: string };

interface Row {
  id: string;
  file: File;
  name: string;
  status: RowStatus;
}

interface BulkUploadDialogProps {
  open: boolean;
  onClose: () => void;
  onUploaded: (result: BulkCreateResult) => void;
}

let rowSeq = 0;

export function BulkUploadDialog({
  open,
  onClose,
  onUploaded,
}: BulkUploadDialogProps) {
  const [rows, setRows] = useState<Row[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset queue when dialog opens
      setRows([]);
      setMessage(null);
      setSubmitting(false);
      setDragOver(false);
    }
  }, [open]);

  const addFiles = useCallback((files: File[]) => {
    setMessage(null);
    setRows((prev) => {
      const space = MAX_BATCH - prev.length;
      const slice = files.slice(0, Math.max(0, space));
      if (files.length > slice.length) {
        setMessage(`Limit is ${MAX_BATCH} files per batch.`);
      }
      const next = slice.map<Row>((file) => {
        const v = validateFile({
          name: file.name,
          type: file.type,
          size: file.size,
        });
        return {
          id: `r${rowSeq++}`,
          file,
          name: nameFromFilename(file.name),
          status: v.ok
            ? { kind: "queued" }
            : { kind: "invalid", reason: v.reason },
        };
      });
      return [...prev, ...next];
    });
  }, []);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = "";
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
  };

  const setRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const removeRow = (id: string) =>
    setRows((prev) => prev.filter((r) => r.id !== id));

  const uploadable = useMemo(
    () =>
      rows.filter(
        (r) => r.status.kind === "queued" || r.status.kind === "error",
      ),
    [rows],
  );
  const canUpload = uploadable.length > 0 && !submitting;
  const hasErrors = uploadable.some((r) => r.status.kind === "error");

  const runUpload = useCallback(async () => {
    if (!canUpload) return;
    setSubmitting(true);
    setMessage(null);
    const targets = rows.filter(
      (r) => r.status.kind === "queued" || r.status.kind === "error",
    );
    const ok = await runWithConcurrency(
      targets,
      UPLOAD_CONCURRENCY,
      async (row): Promise<BulkUploadItem | null> => {
        try {
          setRow(row.id, { status: { kind: "uploading", pct: 0 } });
          const signed = await adminFetch<{
            uploadUrl: string;
            storageKey: string;
            storageProvider: "supabase";
          }>("/api/admin/documents/upload", {
            method: "POST",
            body: JSON.stringify({
              filename: row.file.name,
              contentType: row.file.type,
            }),
          });
          await xhrPut(signed.uploadUrl, row.file, {
            onProgress: (pct) =>
              setRow(row.id, { status: { kind: "uploading", pct } }),
          });
          setRow(row.id, { status: { kind: "done" } });
          return {
            name: row.name.trim() || nameFromFilename(row.file.name),
            storageKey: signed.storageKey,
            storageProvider: "supabase",
            mimeType: row.file.type || null,
            sizeBytes: row.file.size,
          };
        } catch (e) {
          setRow(row.id, {
            status: { kind: "error", reason: (e as Error).message },
          });
          return null;
        }
      },
    );
    const items = ok.filter((x): x is BulkUploadItem => x !== null);
    if (items.length > 0) {
      try {
        const result = await adminFetch<BulkCreateResult>(
          "/api/admin/documents/bulk-create",
          { method: "POST", body: JSON.stringify({ items }) },
        );
        onUploaded(result);
        return;
      } catch (e) {
        setMessage((e as Error).message);
      }
    } else {
      setMessage("No files uploaded.");
    }
    setSubmitting(false);
  }, [canUpload, rows, onUploaded]);

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) onClose();
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-lg w-full p-6 shadow-elevated z-50">
          <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
            Bulk upload documents
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-slate-600 mt-1">
            Files upload to <strong>Uncategorized</strong> and stay unpublished
            until you categorize and publish them.
          </AlertDialog.Description>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              setDragOver(false);
              onDrop(e);
            }}
            className={`mt-4 border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
              dragOver ? "border-navy-500 bg-navy-50/40" : "border-slate-200"
            }`}
          >
            <UploadCloud className="h-6 w-6 text-slate-400 mx-auto" />
            <p className="text-sm text-slate-500 mt-2">
              Drag &amp; drop files here, or{" "}
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-navy-600 font-semibold underline"
              >
                browse
              </button>
            </p>
            <input
              ref={inputRef}
              data-testid="bulk-upload-input"
              type="file"
              multiple
              accept={ALLOWED_EXTENSIONS.join(",")}
              onChange={onInputChange}
              className="hidden"
            />
          </div>

          {rows.length > 0 && (
            <div className="mt-4 max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center gap-2 p-2">
                  <input
                    value={r.name}
                    disabled={
                      r.status.kind === "invalid" ||
                      r.status.kind === "uploading" ||
                      r.status.kind === "done" ||
                      submitting
                    }
                    onChange={(e) => setRow(r.id, { name: e.target.value })}
                    className="flex-1 min-w-0 h-8 px-2 text-sm border border-slate-200 rounded disabled:bg-slate-50 disabled:text-slate-400"
                  />
                  <span className="text-xs text-slate-400 w-28 text-right shrink-0">
                    {r.status.kind === "queued" && "Queued"}
                    {r.status.kind === "invalid" && r.status.reason}
                    {r.status.kind === "uploading" && `${r.status.pct}%`}
                    {r.status.kind === "done" && "Done"}
                    {r.status.kind === "error" && r.status.reason}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${r.file.name}`}
                    disabled={r.status.kind === "uploading"}
                    onClick={() => removeRow(r.id)}
                    className="h-7 w-7 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 rounded disabled:opacity-40"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {message && (
            <p className="mt-3 text-sm text-crimson-700">{message}</p>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={runUpload}
              disabled={!canUpload}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {submitting && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {hasErrors ? "Retry failed" : submitting ? "Uploading…" : "Upload"}
            </button>
            <button
              onClick={() => handleOpenChange(false)}
              disabled={submitting}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300"
            >
              Cancel
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
```

- [ ] **Step 4: Run test + checks**

Run: `npx vitest run src/app/admin/documents/bulk-upload-dialog.test.tsx` → PASS (4 tests).
Run: `npx tsc --noEmit -p tsconfig.json` → 0 errors for this file.
Run: `node -e "const fs=require('fs');console.log('code lines',fs.readFileSync('src/app/admin/documents/bulk-upload-dialog.tsx','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('//')).length)"` → expect < 450.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/bulk-upload-dialog.tsx src/app/admin/documents/bulk-upload-dialog.test.tsx
git commit -m "feat(documents): bulk upload dialog"
```

---

## Task 10: `useUncategorizedActions` hook

**Files:** Create `src/app/admin/documents/use-uncategorized-actions.ts`; Test `…/use-uncategorized-actions.test.ts`

This hook holds the edit + post-upload handlers so `organize-view.tsx` stays under the 450-LOC limit.

- [ ] **Step 1: Write the failing test** — create `src/app/admin/documents/use-uncategorized-actions.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUncategorizedActions } from "./use-uncategorized-actions";
import type { AdminUncategorizedDoc } from "./types";

const doc: AdminUncategorizedDoc = {
  id: "u1",
  slug: "loose-doc",
  name: "Loose Doc",
  description: null,
  published: false,
  external: false,
  url: null,
  storageKey: "documents/k-u1",
  storageProvider: "supabase",
  mimeType: "application/pdf",
};

function makeDeps() {
  return {
    setEditingDoc: vi.fn(),
    setDocDrawerOpen: vi.fn(),
    setBulkUploadOpen: vi.fn(),
    setActiveTab: vi.fn(),
    refetch: vi.fn(),
    toast: vi.fn(),
  };
}

describe("useUncategorizedActions", () => {
  it("handleEditUncategorized opens the drawer with a mapped DocumentItem", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleEditUncategorized(doc);
    expect(deps.setEditingDoc).toHaveBeenCalledWith(
      expect.objectContaining({ id: "u1", categories: [], quickAccess: false }),
    );
    expect(deps.setDocDrawerOpen).toHaveBeenCalledWith(true);
  });

  it("handleBulkUploaded closes dialog, toasts success, switches tab, refetches", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleBulkUploaded({
      created: [{ id: "1", name: "a", slug: "a" }],
      failed: [],
    });
    expect(deps.setBulkUploadOpen).toHaveBeenCalledWith(false);
    expect(deps.toast).toHaveBeenCalledWith(
      "Uploaded 1 to Uncategorized",
      "success",
    );
    expect(deps.setActiveTab).toHaveBeenCalledWith("uncategorized");
    expect(deps.refetch).toHaveBeenCalled();
  });

  it("handleBulkUploaded reports failures as an error toast", () => {
    const deps = makeDeps();
    const { result } = renderHook(() => useUncategorizedActions(deps));
    result.current.handleBulkUploaded({
      created: [{ id: "1", name: "a", slug: "a" }],
      failed: [{ name: "b", error: "x" }],
    });
    expect(deps.toast).toHaveBeenCalledWith(
      "Uploaded 1 to Uncategorized — 1 failed",
      "error",
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `npx vitest run src/app/admin/documents/use-uncategorized-actions.test.ts` → FAIL (module not found).

- [ ] **Step 3: Implement** — create `src/app/admin/documents/use-uncategorized-actions.ts`:

```ts
"use client";

import { useCallback } from "react";
import { uncategorizedToDocumentItem } from "@/lib/documents-organize/shapers";
import type { BulkCreateResult } from "@/lib/documents/bulk-upload";
import type { AdminUncategorizedDoc, DocumentItem, OrganizeTab } from "./types";

interface Deps {
  setEditingDoc: (item: DocumentItem) => void;
  setDocDrawerOpen: (open: boolean) => void;
  setBulkUploadOpen: (open: boolean) => void;
  setActiveTab: (tab: OrganizeTab) => void;
  refetch: () => void;
  toast: (message: string, kind: "success" | "error") => void;
}

export function useUncategorizedActions(deps: Deps) {
  const {
    setEditingDoc,
    setDocDrawerOpen,
    setBulkUploadOpen,
    setActiveTab,
    refetch,
    toast,
  } = deps;

  const handleEditUncategorized = useCallback(
    (doc: AdminUncategorizedDoc) => {
      setEditingDoc(uncategorizedToDocumentItem(doc));
      setDocDrawerOpen(true);
    },
    [setEditingDoc, setDocDrawerOpen],
  );

  const handleBulkUploaded = useCallback(
    (result: BulkCreateResult) => {
      setBulkUploadOpen(false);
      const okN = result.created.length;
      const failN = result.failed.length;
      toast(
        `Uploaded ${okN} to Uncategorized` +
          (failN > 0 ? ` — ${failN} failed` : ""),
        failN > 0 ? "error" : "success",
      );
      setActiveTab("uncategorized");
      refetch();
    },
    [setBulkUploadOpen, toast, setActiveTab, refetch],
  );

  return { handleEditUncategorized, handleBulkUploaded };
}
```

- [ ] **Step 4: Run test to verify it passes** — `npx vitest run src/app/admin/documents/use-uncategorized-actions.test.ts` → PASS (3 tests). (`@testing-library/react` provides `renderHook`.)

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/use-uncategorized-actions.ts src/app/admin/documents/use-uncategorized-actions.test.ts
git commit -m "feat(documents): useUncategorizedActions hook"
```

---

## Task 11: Bulk upload button in the toolbar

**Files:** Modify `src/components/admin/documents-organize/organize-toolbar.tsx`, `…/organize-toolbar.test.tsx`

- [ ] **Step 1: Read both files.** The toolbar imports `{ Plus, Search, Trash2 }`; props include `onBulkDelete`; renders `{!preview && (<> Bulk delete … Add Document </>)}`. The test `setup(overrides)` passes all props incl. `onBulkDelete` and returns the mocks.

- [ ] **Step 2: Add failing tests.** In `organize-toolbar.test.tsx`, add `onBulkUpload: vi.fn()` to the `setup()` render props and its returned object; add:

```ts
  it("fires onBulkUpload when Bulk upload is clicked", () => {
    const { onBulkUpload } = setup();
    fireEvent.click(screen.getByRole("button", { name: /bulk upload/i }));
    expect(onBulkUpload).toHaveBeenCalledOnce();
  });
  it("hides Bulk upload in preview mode", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("button", { name: /bulk upload/i }),
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 3: Run test to verify it fails** — `npx vitest run src/components/admin/documents-organize/organize-toolbar.test.tsx` → FAIL.

- [ ] **Step 4: Implement.** Change lucide import to `import { Plus, Search, Trash2, UploadCloud } from "lucide-react";`. Add `onBulkUpload: () => void;` to `OrganizeToolbarProps` and the destructured params. Inside the existing `{!preview && (<> … </>)}` fragment, add this button **before** the Bulk delete button:

```tsx
            <button
              type="button"
              onClick={onBulkUpload}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-slate-200 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
            >
              <UploadCloud className="h-4 w-4" />
              Bulk upload
            </button>
```

- [ ] **Step 5: Run test to verify it passes** — `npx vitest run src/components/admin/documents-organize/organize-toolbar.test.tsx` → PASS (7 existing + 2 = 9).

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/documents-organize/organize-toolbar.tsx src/components/admin/documents-organize/organize-toolbar.test.tsx
git commit -m "feat(documents): bulk upload toolbar button"
```

---

## Task 12: Decompose `organize-view.tsx` (pure refactor — no behavior change)

`organize-view.tsx` is **440 code lines** (10 from the non-negotiable 450 limit); the feature must not push any commit over it. This task extracts two cohesive units and generalizes the delete-state type **without changing behavior**, dropping the file to ≈390 code lines so the feature wiring (Task 13) lands ≈427 — every commit stays under 450.

**Files:** Create `src/app/admin/documents/organize-dialogs.tsx` (+ no test — pure JSX relocation, covered by existing tests + tsc); Create `src/components/admin/documents-organize/section-tabs.tsx` (+ `.test.tsx`); Modify `src/app/admin/documents/organize-view.tsx`

- [ ] **Step 1: Read `organize-view.tsx`.** Confirm the tail structure: tab-bar `<div className="flex items-center gap-1 …">{TABS.map(…)}</div>`; `<OrganizeToolbar … onBulkDelete={() => setBulkOpen(true)} />`; the mobile-hint `<div className="xl:hidden …">`; the `<DndContextProvider …><SectionBoard … onDeleteDoc={setPendingDelete} /></DndContextProvider>` block; then four elements `<DocumentDrawer … />`, `<DocumentCategoryDrawer … />`, `<ConfirmDialog … />`, `<BulkDeleteDialog … />`; `pendingDelete` is `useState<AdminDocumentInCategory | null>(null)`.

- [ ] **Step 2: Generalize `pendingDelete` (behavior-preserving).** `confirmDelete` and `ConfirmDialog` only read `.id`/`.name`; `SectionBoard.onDeleteDoc` passes an `AdminDocumentInCategory`. Change the state to the minimal shape:

```tsx
  const [pendingDelete, setPendingDelete] =
    useState<{ id: string; name: string } | null>(null);
```

and change the `SectionBoard` prop from `onDeleteDoc={setPendingDelete}` to:

```tsx
          onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })}
```

(Everything else that reads `pendingDelete` already uses only `.id`/`.name`.)

- [ ] **Step 3: Create `SectionTabs`** — `src/components/admin/documents-organize/section-tabs.tsx`:

```tsx
"use client";

import type { OrganizeTab } from "@/app/admin/documents/types";

interface SectionTabsProps {
  tabs: Array<{ key: OrganizeTab; label: string }>;
  activeTab: OrganizeTab;
  onSelect: (tab: OrganizeTab) => void;
  counts: Record<OrganizeTab, number>;
}

export function SectionTabs({
  tabs,
  activeTab,
  onSelect,
  counts,
}: SectionTabsProps) {
  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-fit">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onSelect(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 ${
              isActive
                ? "bg-white text-navy-700 shadow-sm"
                : "text-slate-500 hover:text-navy-600"
            }`}
          >
            {tab.label}
            <span
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full transition-colors ${
                isActive
                  ? "bg-crimson-50 text-crimson-600"
                  : "bg-slate-200/60 text-slate-400"
              }`}
            >
              {counts[tab.key]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

and `src/components/admin/documents-organize/section-tabs.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SectionTabs } from "./section-tabs";

describe("SectionTabs", () => {
  it("renders counts and fires onSelect", () => {
    const onSelect = vi.fn();
    render(
      <SectionTabs
        tabs={[
          { key: "office", label: "Office" },
          { key: "uncategorized", label: "Uncategorized" },
        ]}
        activeTab="office"
        onSelect={onSelect}
        counts={{ office: 3, listing: 0, sales: 0, uncategorized: 7 }}
      />,
    );
    expect(screen.getByText("7")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /uncategorized/i }));
    expect(onSelect).toHaveBeenCalledWith("uncategorized");
  });
});
```

Run `npx vitest run src/components/admin/documents-organize/section-tabs.test.tsx` → PASS.

(`OrganizeTab` exists from Task 3. Note `TABS` in `organize-view.tsx` is still typed `Array<{ key: DocumentSection; label }>` at this point — to pass it to `SectionTabs` in Step 5 you will retype `TABS` to `OrganizeTab` keys; that is type-safe because `DocumentSection ⊂ OrganizeTab`. The `counts` literal in Step 5 supplies all four keys even though only three tabs exist yet — harmless.)

- [ ] **Step 4: Create `OrganizeDialogs`** — `src/app/admin/documents/organize-dialogs.tsx`. This moves the four dialog/drawer elements verbatim; only the inline close arrows are reconstructed from passed setters (pure relocation):

```tsx
"use client";

import { DocumentDrawer } from "@/components/admin/document-drawer";
import { DocumentCategoryDrawer } from "@/components/admin/document-category-drawer";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import type { BulkDeleteResult } from "@/lib/documents/bulk-delete";
import type {
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
} from "./types";

interface OrganizeDialogsProps {
  docDrawerOpen: boolean;
  setDocDrawerOpen: (open: boolean) => void;
  editingDoc: DocumentItem | null;
  setEditingDoc: (doc: DocumentItem | null) => void;
  drawerCategories: DocumentCategoryItem[];
  addDocSection: DocumentSection;
  catDrawerOpen: boolean;
  setCatDrawerOpen: (open: boolean) => void;
  editingCat: DocumentCategoryItem | null;
  setEditingCat: (cat: DocumentCategoryItem | null) => void;
  pendingDelete: { id: string; name: string } | null;
  deleting: boolean;
  confirmDelete: () => void;
  setPendingDelete: (value: { id: string; name: string } | null) => void;
  bulkOpen: boolean;
  setBulkOpen: (open: boolean) => void;
  handleBulkDeleted: (result: BulkDeleteResult) => void;
  refetch: () => void;
}

export function OrganizeDialogs({
  docDrawerOpen,
  setDocDrawerOpen,
  editingDoc,
  setEditingDoc,
  drawerCategories,
  addDocSection,
  catDrawerOpen,
  setCatDrawerOpen,
  editingCat,
  setEditingCat,
  pendingDelete,
  deleting,
  confirmDelete,
  setPendingDelete,
  bulkOpen,
  setBulkOpen,
  handleBulkDeleted,
  refetch,
}: OrganizeDialogsProps) {
  return (
    <>
      <DocumentDrawer
        open={docDrawerOpen}
        onClose={() => {
          setDocDrawerOpen(false);
          setEditingDoc(null);
        }}
        item={editingDoc}
        categories={drawerCategories}
        onSaved={refetch}
        defaultSection={addDocSection}
      />

      <DocumentCategoryDrawer
        open={catDrawerOpen}
        onClose={() => {
          setCatDrawerOpen(false);
          setEditingCat(null);
        }}
        item={editingCat}
        onSaved={refetch}
      />

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete Document"
        message={
          pendingDelete
            ? `This will permanently delete "${pendingDelete.name}" and its file. Agent favorites and drafts that reference this document will remain but show as missing. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete permanently"
        typeToConfirm="DELETE"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />

      <BulkDeleteDialog
        open={bulkOpen}
        onClose={() => setBulkOpen(false)}
        onDeleted={handleBulkDeleted}
        categories={drawerCategories.map((c) => ({
          id: c.id,
          title: c.title,
          section: c.section,
        }))}
      />
    </>
  );
}
```

- [ ] **Step 5: Rewire `organize-view.tsx`.** Add imports `import { OrganizeDialogs } from "./organize-dialogs";` and `import { SectionTabs } from "@/components/admin/documents-organize/section-tabs";`. Remove the now-unused direct imports of `DocumentDrawer`, `DocumentCategoryDrawer`, `ConfirmDialog`, `BulkDeleteDialog` **only if** they are no longer referenced elsewhere in the file (they are not — they appear only in the moved block; remove those four imports). Retype `TABS` to `Array<{ key: OrganizeTab; label: string }>` and add `import type { OrganizeTab } from "./types";` (keep `DocumentSection` import). Replace the inline tab-bar `<div>…{TABS.map(…)}…</div>` with:

```tsx
      <SectionTabs
        tabs={TABS}
        activeTab={activeTab}
        onSelect={setActiveTab}
        counts={{
          office: sectionCounts.office,
          listing: sectionCounts.listing,
          sales: sectionCounts.sales,
          uncategorized: 0,
        }}
      />
```

Replace the four `<DocumentDrawer/> … <BulkDeleteDialog/>` elements with:

```tsx
      <OrganizeDialogs
        docDrawerOpen={docDrawerOpen}
        setDocDrawerOpen={setDocDrawerOpen}
        editingDoc={editingDoc}
        setEditingDoc={setEditingDoc}
        drawerCategories={drawerCategories}
        addDocSection={addDocSection}
        catDrawerOpen={catDrawerOpen}
        setCatDrawerOpen={setCatDrawerOpen}
        editingCat={editingCat}
        setEditingCat={setEditingCat}
        pendingDelete={pendingDelete}
        deleting={deleting}
        confirmDelete={confirmDelete}
        setPendingDelete={setPendingDelete}
        bulkOpen={bulkOpen}
        setBulkOpen={setBulkOpen}
        handleBulkDeleted={handleBulkDeleted}
        refetch={refetch}
      />
```

(`setActiveTab` is `(t: OrganizeTab)=>void` after Task 5, so `SectionTabs.onSelect` matches. `setPendingDelete` is now `(v:{id;name}|null)=>void` after Step 2, matching the `OrganizeDialogs` prop.)

- [ ] **Step 6: Verify (behavior unchanged, file smaller)**

Run: `npx tsc --noEmit -p tsconfig.json` → exits 0 project-wide.
Run: `npx vitest run src/app/admin/documents src/components/admin/documents-organize` → all existing tests pass (no behavior change).
Run: `node -e "const fs=require('fs');console.log('organize-view code lines',fs.readFileSync('src/app/admin/documents/organize-view.tsx','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('//')).length)"` → expect ≈ **390** (must be **< 450**; if not, STOP and report — do not commit an over-limit file).

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/documents/organize-dialogs.tsx src/components/admin/documents-organize/section-tabs.tsx src/components/admin/documents-organize/section-tabs.test.tsx src/app/admin/documents/organize-view.tsx
git commit -m "refactor(documents): extract OrganizeDialogs + SectionTabs from organize-view"
```

---

## Task 13: Wire the bulk-upload feature into `organize-view.tsx`

**Files:** Modify `src/app/admin/documents/organize-view.tsx`, `src/app/admin/documents/organize-dialogs.tsx`

> **Context after Task 12:** `organize-view.tsx` is now ≈390 code lines. The tab bar is `<SectionTabs … counts={{office,listing,sales,uncategorized:0}} />`; the four dialogs are `<OrganizeDialogs … />`; `pendingDelete` is already `{ id; name } | null` and `SectionBoard.onDeleteDoc` is already `(d) => setPendingDelete({ id: d.id, name: d.name })`; `TABS` is already typed `Array<{ key: OrganizeTab; label }>` (3 entries) and `OrganizeTab` is imported. This task only adds the feature.

- [ ] **Step 1: Read `organize-view.tsx` and `organize-dialogs.tsx`** to confirm the post-Task-12 state above.

- [ ] **Step 2: Imports (organize-view).** Add:

```tsx
import { UncategorizedList } from "./uncategorized-list";
import { useUncategorizedActions } from "./use-uncategorized-actions";
```

(`BulkUploadDialog` is rendered inside `OrganizeDialogs`, not here. `OrganizeTab` is already imported from Task 12.)

- [ ] **Step 3: 4th tab + state.** Add the entry to `TABS` (already `OrganizeTab`-typed):

```tsx
  { key: "uncategorized", label: "Uncategorized" },
```

After `const [bulkUploadOpen, setBulkUploadOpen] = useState(false);`? — it does not exist yet; add it right after `const [bulkOpen, setBulkOpen] = useState(false);`:

```tsx
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
```

- [ ] **Step 4: B2 fix.** In `handleAddDocument`, change `setAddDocSection(activeTab)` to:

```tsx
    setAddDocSection(activeTab === "uncategorized" ? "office" : activeTab);
```

- [ ] **Step 5: Hook.** After the existing `handleBulkDeleted` `useCallback`, add:

```tsx
  const { handleEditUncategorized, handleBulkUploaded } =
    useUncategorizedActions({
      setEditingDoc,
      setDocDrawerOpen,
      setBulkUploadOpen,
      setActiveTab,
      refetch,
      toast,
    });
```

- [ ] **Step 6: Uncategorized docs/count.** After the `sectionCounts` computation add:

```tsx
  const uncategorizedDocs = tree.uncategorized ?? [];
  const uncategorizedCount = uncategorizedDocs.length;
```

- [ ] **Step 7: SectionTabs count.** In the `<SectionTabs … counts={{ … }} />` element, change the `uncategorized: 0` placeholder to `uncategorized: uncategorizedCount`.

- [ ] **Step 8: Body render.** The current body is the `<DndContextProvider …><SectionBoard … onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })} /></DndContextProvider>` block (unchanged from Task 12). Wrap that **entire existing block byte-for-byte unchanged** in a ternary:

```tsx
      {activeTab === "uncategorized" ? (
        <UncategorizedList
          docs={uncategorizedDocs}
          onEdit={handleEditUncategorized}
          onDelete={(d) => setPendingDelete({ id: d.id, name: d.name })}
        />
      ) : (
        /* the EXISTING <DndContextProvider> … <SectionBoard … /> … </DndContextProvider>
           block from Task 12, completely unchanged */
        <DndContextProvider /* keep existing props */>
          <SectionBoard /* keep ALL existing props incl. onDeleteDoc inline */ />
        </DndContextProvider>
      )}
```

Do not rewrite the provider props / overlay / SectionBoard props from memory — keep them exactly as on disk; the only change is the ternary wrap. `activeTab` narrows to `DocumentSection` in the `else`, so `section={activeTab}` / `tree.sections[activeTab]` type-check.

- [ ] **Step 9: Toolbar prop.** On `<OrganizeToolbar … />` add:

```tsx
        onBulkUpload={() => {
          setActiveTab("uncategorized");
          setBulkUploadOpen(true);
        }}
```

- [ ] **Step 10: Add `BulkUploadDialog` to `OrganizeDialogs`.** In `organize-dialogs.tsx`: add imports `import { BulkUploadDialog } from "./bulk-upload-dialog";` and `import type { BulkCreateResult } from "@/lib/documents/bulk-upload";`; add to `OrganizeDialogsProps`:

```tsx
  bulkUploadOpen: boolean;
  setBulkUploadOpen: (open: boolean) => void;
  handleBulkUploaded: (result: BulkCreateResult) => void;
```

destructure the three new props; render this as the last element inside the fragment (after `<BulkDeleteDialog … />`):

```tsx
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={handleBulkUploaded}
      />
```

Then in `organize-view.tsx`, pass the three new props on the existing `<OrganizeDialogs … />` element:

```tsx
        bulkUploadOpen={bulkUploadOpen}
        setBulkUploadOpen={setBulkUploadOpen}
        handleBulkUploaded={handleBulkUploaded}
```

- [ ] **Step 11: Verify (mandatory LOC gate)**

Run: `npx tsc --noEmit -p tsconfig.json` → exits 0 project-wide.
Run: `npx vitest run src/lib/documents/bulk-upload.test.ts src/app/api/admin/documents/bulk-create/route.test.ts src/app/api/admin/documents/organize/route.test.ts src/lib/documents-organize/shapers.test.ts src/app/admin/documents/uncategorized-list.test.tsx src/app/admin/documents/bulk-upload-dialog.test.tsx src/app/admin/documents/use-uncategorized-actions.test.ts src/components/admin/documents-organize/organize-toolbar.test.tsx src/components/admin/documents-organize/section-tabs.test.tsx` → all pass.
Run: `node -e "const fs=require('fs');console.log('organize-view code lines',fs.readFileSync('src/app/admin/documents/organize-view.tsx','utf8').split(/\r?\n/).filter(l=>l.trim()&&!l.trim().startsWith('//')).length)"` → expect ≈ **427**; **MUST be < 450**. If ≥ 450, STOP — do not commit; report (extraction in Task 12 should have prevented this).

- [ ] **Step 12: Commit**

```bash
git add src/app/admin/documents/organize-view.tsx src/app/admin/documents/organize-dialogs.tsx
git commit -m "feat(documents): wire bulk upload + uncategorized tab into organize view"
```

- [ ] **Step 2: Imports.** After the `BulkDeleteDialog` import add:

```tsx
import { BulkUploadDialog } from "./bulk-upload-dialog";
import { UncategorizedList } from "./uncategorized-list";
import { useUncategorizedActions } from "./use-uncategorized-actions";
import type { OrganizeTab } from "./types";
```

(`AdminUncategorizedDoc` is referenced only via the hook + list; no extra import needed unless the file already imports types from `./types` — add `AdminUncategorizedDoc` to that existing import if you reference it directly in the delete handler typing; otherwise infer via the list's prop.)

- [ ] **Step 3: `TABS` + state.** Change `TABS` to:

```tsx
const TABS: Array<{ key: OrganizeTab; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
  { key: "uncategorized", label: "Uncategorized" },
];
```

After `const [bulkOpen, setBulkOpen] = useState(false);` add:

```tsx
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
```

Generalize the delete state type (both shapes have `id`+`name`; `confirmDelete`/`ConfirmDialog` read only `.id`/`.name`):

```tsx
  const [pendingDelete, setPendingDelete] =
    useState<{ id: string; name: string } | null>(null);
```

- [ ] **Step 4: B2 fix — `setAddDocSection`.** In `handleAddDocument`, change `setAddDocSection(activeTab)` to:

```tsx
    setAddDocSection(activeTab === "uncategorized" ? "office" : activeTab);
```

- [ ] **Step 5: Hook.** After the existing `handleBulkDeleted` `useCallback`, add:

```tsx
  const { handleEditUncategorized, handleBulkUploaded } =
    useUncategorizedActions({
      setEditingDoc,
      setDocDrawerOpen,
      setBulkUploadOpen,
      setActiveTab,
      refetch,
      toast,
    });
```

- [ ] **Step 6: Uncategorized count.** After the `sectionCounts` computation add:

```tsx
  const uncategorizedDocs = tree.uncategorized ?? [];
  const uncategorizedCount = uncategorizedDocs.length;
```

- [ ] **Step 7: Tab-bar count expression.** In the tab `.map(...)`, replace the count cell `{sectionCounts[tab.key]}` with:

```tsx
{tab.key === "uncategorized"
  ? uncategorizedCount
  : sectionCounts[tab.key as DocumentSection]}
```

(`DocumentSection` is already imported in this file.)

- [ ] **Step 8: Body render (single definitive change).** Find the existing region:

```tsx
      <DndContextProvider … >
        <SectionBoard … onDeleteDoc={setPendingDelete} />
      </DndContextProvider>
```

Wrap that **entire existing `<DndContextProvider>…</DndContextProvider>` block byte-for-byte unchanged** (keep its `onDragStart`/`onDragEnd`/`onDragCancel`/`overlay` props and the `<SectionBoard>` props exactly) inside a ternary, and change only `SectionBoard`'s `onDeleteDoc`:

```tsx
      {activeTab === "uncategorized" ? (
        <UncategorizedList
          docs={uncategorizedDocs}
          onEdit={handleEditUncategorized}
          onDelete={(d) => setPendingDelete({ id: d.id, name: d.name })}
        />
      ) : (
        /* the EXISTING <DndContextProvider> … <SectionBoard … /> … </DndContextProvider>
           block, unchanged except: onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })} */
        <DndContextProvider /* keep existing props */>
          <SectionBoard
            /* keep ALL existing props */
            onDeleteDoc={(d) => setPendingDelete({ id: d.id, name: d.name })}
          />
        </DndContextProvider>
      )}
```

Rules: do not rewrite the `<DndContextProvider>` props or `overlay` JSX from memory — keep them exactly as they are in the file; the only edits are (a) wrapping in the ternary and (b) `onDeleteDoc` becoming the inline `(d) => setPendingDelete({ id: d.id, name: d.name })` (it was `onDeleteDoc={setPendingDelete}` — direct ref no longer type-matches the narrowed state cleanly, so make it explicit). `activeTab` narrows to `DocumentSection` in the `else` branch, so the existing `section={activeTab}` / `tree.sections[activeTab]` inside `SectionBoard` type-check.

- [ ] **Step 9: Toolbar prop.** On the `<OrganizeToolbar … />` element add:

```tsx
        onBulkUpload={() => {
          setActiveTab("uncategorized");
          setBulkUploadOpen(true);
        }}
```

- [ ] **Step 10: Render the upload dialog.** Immediately after the `<BulkDeleteDialog … />` element add:

```tsx
      <BulkUploadDialog
        open={bulkUploadOpen}
        onClose={() => setBulkUploadOpen(false)}
        onUploaded={handleBulkUploaded}
      />
```

- [ ] **Step 11: Verify**

Run: `npx tsc --noEmit -p tsconfig.json` → exits 0 project-wide.
Run: `npx vitest run src/lib/documents/bulk-upload.test.ts src/app/api/admin/documents/bulk-create/route.test.ts src/app/api/admin/documents/organize/route.test.ts src/lib/documents-organize/shapers.test.ts src/app/admin/documents/uncategorized-list.test.tsx src/app/admin/documents/bulk-upload-dialog.test.tsx src/app/admin/documents/use-uncategorized-actions.test.ts src/components/admin/documents-organize/organize-toolbar.test.tsx` → all pass.

- [ ] **Step 12: Commit**

```bash
git add src/app/admin/documents/organize-view.tsx
git commit -m "feat(documents): wire bulk upload + uncategorized tab into organize view"
```

---

## Task 14: Full verification

- [ ] **Step 1:** `npm run verify` → ESLint clean, `tsc` clean, all Vitest files pass, `next build` succeeds.

- [ ] **Step 2:** Fix any failures; re-run until green; commit fixes:

```bash
git add -- 'src/**' && git commit -m "fix(documents): address bulk-upload verification issues"
```

- [ ] **Step 3: Manual smoke (optional; no DB migration needed — uploads are unpublished/uncategorized = safe/reversible).** If a dev server is available: `/admin/documents` as admin → **Bulk upload** → drop valid+invalid files → invalid excluded with reason, rename + remove work, progress shows, success switches to **Uncategorized (n)**, **Categorize** opens the drawer; assigning a category (must also pick the Section in the drawer — it defaults to Office) removes the doc from Uncategorized after refetch; Delete removes it. Confirm a non-admin gets 403.

---

## Self-Review

**Spec coverage:** Approach-A no-schema (Tasks 2/3/4); published:false + no membership (Task 2); review-list dialog with validation/rename/remove/Retry (Task 9); 4th Uncategorized tab (Tasks 3/5/12/13); dedicated bulk-create (Task 2); limits (Task 1 constants, Task 2 `.max(50)`); admin-only (Task 2 gate); upload route reused unchanged. Non-goals respected. Move-out = existing `DocumentDrawer` via `uncategorizedToDocumentItem` (Tasks 7/10/13) — corrected from the spec's optimistic "drag" (uncategorized docs have no `fromCategoryId`). No publish toggle on Uncategorized rows; **no "Open" action** (B4 — viewer/by-slug reject unpublished, and all uncategorized docs are unpublished).

**Placeholder scan:** No TBD/TODO; every code step is complete. The LOC checks (Task 12 Step 6, Task 13 Step 11) are mandatory gates with exact commands, not placeholders.

**Type consistency:** `OrganizeTab`/`AdminUncategorizedDoc`/`OrganizeTree.uncategorized?` (Task 3) consumed identically in Tasks 4/5/6/7/8/10/12/13. `BulkCreateResult`/`BulkUploadItem`/`validateFile`/`nameFromFilename`/`runWithConcurrency`/`xhrPut` (Task 1) consumed identically in Tasks 9/10. `uncategorizedToDocumentItem` (Task 7) used by the hook (Task 10). Mock shapes match real prisma/admin-api/slug calls.

**Phase-1 hardening incorporated (review rounds 1 & 2):**
- **B1** — `use-organize-drag-end.ts` `activeTab` widened to `OrganizeTab` + `activeTab === "uncategorized"` added to the callback guard (Task 6); narrowing makes the rest type-check; runtime-safe (DnD provider not rendered on that tab). Verified by review round 2 to compile under `--strict`.
- **B2** — `setAddDocSection(activeTab === "uncategorized" ? "office" : activeTab)` (Task 13 Step 4); confirmed the only offending site.
- **B3 (fully resolved)** — `organize-view.tsx` is **decomposed first** (Task 12: pure, behavior-preserving extraction of `OrganizeDialogs` + `SectionTabs` + `pendingDelete` generalization → ≈390 code lines, its own commit) **before** feature wiring (Task 13 → ≈427 code lines, its own commit). **Every commit stays < 450**; both Task 12 Step 6 and Task 13 Step 11 are mandatory STOP-if-≥450 gates. This replaces the earlier under-powered single-extraction approach the round-2 review measured at 458.
- **B4** — "Open" action removed from `UncategorizedList`/handlers/tests (Task 8) since unpublished docs can't be opened by the existing viewer/by-slug API.
- **OrganizeTree ripple** — `uncategorized` made **optional** (Task 3) so existing `{ sections }` constructors (`reorder.ts:101`, `use-organize-drag-end.ts` `setTree`, reorder fixtures, optimistic `setTree`) need zero changes (round-2 verified).
- **Other:** `runWithConcurrency` test name corrected (propagates, not isolates); dialog open-reset `useEffect` + drag-over highlight added; Task 4 reworded (no whole-tree assertion exists); Task 5 "five edit sites"; drawer Section default ("office") for a Listing/Sales doc noted in the Task 14 smoke. `renderHook` confirmed exported by the installed `@testing-library/react@16` (round-2). organize-view integration verified via `tsc` + component/route tests + manual smoke (no `organize-view.test`, consistent with the repo / the shipped bulk-delete approach). bulk-create trusts admin-supplied `storageKey` (same model as the existing single-create route; admin-only) and is non-transactional for real partial success (spec §5.2); ≤50 sequential creates over the pooler — bounded/acceptable.

**Round-2 verified-correct:** B1 narrowing compiles under `--strict`; OrganizeTree-optional resolves all `{sections}` constructors with zero edits; B2 site confirmed; B4 clean; `renderHook` available; `uncategorizedToDocumentItem` matches `DocumentItem` exactly and the drawer→PATCH→membership flow is sound; `SectionTabs` typing correct; Task 13 Step 8 body-render unambiguous; all provided tests will pass; security/perf/edge-cases sound. Only B3 needed the further fix above.
