# Admin Bulk Delete — Document Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admins permanently bulk-delete documents from the Documents Library — entire library or scoped by section/category — behind a typed confirmation, with a dedicated audit log.

**Architecture:** A new `bulk-delete` admin API route exposes `GET` (preview counts for a scope) and `POST` (execute). The `POST` resolves the matched document set, enforces a count-drift guard, deletes the rows + writes a `DocumentDeletionLog` row inside one Prisma transaction, then cleans up Supabase storage objects post-commit. A confirmation dialog on the admin documents page drives it.

**Tech Stack:** Next.js App Router route handlers, Prisma (PostgreSQL), Zod, Supabase Storage admin client, Radix AlertDialog, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-05-19-admin-bulk-delete-documents-design.md`

**Pre-flight (per project CLAUDE.md Rule 9, before ANY code):** run `/git-workflow-planning:start feature document-library`. We are already on branch `feature/document-library`; the command will confirm/attach to it and track this plan file.

---

## File Structure

**Create:**
- `src/lib/documents/bulk-delete.ts` — pure helpers: scope→Prisma-where builder, cross-section where builder, `chunk`, the `DELETE ALL` phrase constant, shared request/response types.
- `src/lib/documents/bulk-delete.test.ts` — unit tests for the pure helpers.
- `src/app/api/admin/documents/bulk-delete/route.ts` — `GET` preview + `POST` execute.
- `src/app/api/admin/documents/bulk-delete/route.test.ts` — route integration tests (mocked prisma/auth/supabase).
- `src/app/admin/documents/bulk-delete-dialog.tsx` — scope selector + live count + typed-confirm modal.
- `src/app/admin/documents/bulk-delete-dialog.test.tsx` — dialog behavior tests.

**Modify:**
- `prisma/schema.prisma` — add `DocumentDeletionLog` model (+ migration).
- `src/components/admin/documents-organize/organize-toolbar.tsx` — add a "Bulk delete" button + `onBulkDelete` prop.
- `src/app/admin/documents/organize-view.tsx` — dialog state, render dialog, wire toolbar, refetch on success.

Each file has one responsibility: pure logic (lib), transport (route), presentation (dialog), wiring (organize-view).

---

## Task 1: Add `DocumentDeletionLog` model + migration

**Files:**
- Modify: `prisma/schema.prisma` (insert after `model DocumentRecent { … }`, which ends at line 1132, before `model BillingSettings`)

- [ ] **Step 1: Add the model to the schema**

Insert this block immediately after the closing `}` of `model DocumentRecent` (line 1132) and before `model BillingSettings`:

```prisma
model DocumentDeletionLog {
  id                    String   @id @default(cuid())
  adminUserId           String
  adminEmail            String?
  outcome               String   @default("executed")
  scopeType             String
  section               String?
  categoryId            String?
  categoryName          String?
  expectedDocumentCount Int?
  actualDocumentCount   Int?
  documentCount         Int
  draftCount            Int
  favoriteCount         Int
  recentCount           Int
  crossSectionCount     Int      @default(0)
  storageRequested      Int      @default(0)
  storageRemoved        Int      @default(0)
  storageErrors         Int      @default(0)
  storageErrorKeys      String[] @default([])
  createdAt             DateTime @default(now())

  @@index([createdAt])
}
```

- [ ] **Step 2: Validate the schema**

Run: `npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 3: Create the migration and regenerate the client**

> NOTE (project CLAUDE.md Rule 8): local dev and production share one Supabase project, so this migration runs against production. This change is purely additive (a new table) and safe.

Run: `npx prisma migrate dev --name add_document_deletion_log`
Expected: a new folder under `prisma/migrations/` and `✔ Generated Prisma Client`.

- [ ] **Step 4: Verify the type exists**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exits 0 (no errors). The `DocumentDeletionLog` delegate is now on `prisma`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(documents): add DocumentDeletionLog model"
```

---

## Task 2: Pure helpers (`src/lib/documents/bulk-delete.ts`)

**Files:**
- Create: `src/lib/documents/bulk-delete.ts`
- Test: `src/lib/documents/bulk-delete.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/documents/bulk-delete.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CONFIRMATION_PHRASE,
  buildDocumentWhere,
  buildCrossSectionWhere,
  chunk,
} from "./bulk-delete";

describe("CONFIRMATION_PHRASE", () => {
  it("is exactly 'DELETE ALL'", () => {
    expect(CONFIRMATION_PHRASE).toBe("DELETE ALL");
  });
});

describe("buildDocumentWhere", () => {
  it("matches everything for scopeType 'all'", () => {
    expect(buildDocumentWhere({ scopeType: "all" })).toEqual({});
  });

  it("filters by section", () => {
    expect(
      buildDocumentWhere({ scopeType: "section", section: "office" }),
    ).toEqual({ categories: { some: { category: { section: "office" } } } });
  });

  it("filters by category", () => {
    expect(
      buildDocumentWhere({
        scopeType: "category",
        section: "listing",
        categoryId: "cat_1",
      }),
    ).toEqual({ categories: { some: { categoryId: "cat_1" } } });
  });
});

describe("buildCrossSectionWhere", () => {
  it("ANDs the base where with a different-section membership", () => {
    const base = { categories: { some: { category: { section: "office" } } } };
    expect(buildCrossSectionWhere(base, "office")).toEqual({
      AND: [
        base,
        { categories: { some: { category: { section: { not: "office" } } } } },
      ],
    });
  });
});

describe("chunk", () => {
  it("splits an array into fixed-size chunks", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });

  it("returns an empty array for empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/documents/bulk-delete.test.ts`
Expected: FAIL — `Cannot find module './bulk-delete'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/documents/bulk-delete.ts`:

```ts
import type { Prisma } from "@prisma/client";
import type { DocumentSection } from "@/types/document-library";

export const CONFIRMATION_PHRASE = "DELETE ALL";

export type BulkDeleteScope =
  | { scopeType: "all" }
  | { scopeType: "section"; section: DocumentSection }
  | { scopeType: "category"; section: DocumentSection; categoryId: string };

export interface BulkDeletePreview {
  documentCount: number;
  draftCount: number;
  favoriteCount: number;
  recentCount: number;
  crossSectionCount: number;
}

export interface BulkDeleteResult {
  success: true;
  documentCount: number;
  draftCount: number;
  favoriteCount: number;
  recentCount: number;
  storageRequested: number;
  storageRemoved: number;
  storageErrors: number;
}

export function buildDocumentWhere(
  scope: BulkDeleteScope,
): Prisma.DocumentWhereInput {
  if (scope.scopeType === "all") return {};
  if (scope.scopeType === "section") {
    return { categories: { some: { category: { section: scope.section } } } };
  }
  return { categories: { some: { categoryId: scope.categoryId } } };
}

export function buildCrossSectionWhere(
  base: Prisma.DocumentWhereInput,
  targetSection: string,
): Prisma.DocumentWhereInput {
  return {
    AND: [
      base,
      { categories: { some: { category: { section: { not: targetSection } } } } },
    ],
  };
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/documents/bulk-delete.test.ts`
Expected: PASS (all assertions green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/documents/bulk-delete.ts src/lib/documents/bulk-delete.test.ts
git commit -m "feat(documents): bulk-delete scope helpers"
```

---

## Task 3: Preview endpoint — `GET /api/admin/documents/bulk-delete`

**Files:**
- Create: `src/app/api/admin/documents/bulk-delete/route.ts`
- Test: `src/app/api/admin/documents/bulk-delete/route.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/app/api/admin/documents/bulk-delete/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  documentCountMock,
  documentFindManyMock,
  draftCountMock,
  favoriteCountMock,
  recentCountMock,
  categoryFindUniqueMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  documentCountMock: vi.fn(),
  documentFindManyMock: vi.fn(),
  draftCountMock: vi.fn(),
  favoriteCountMock: vi.fn(),
  recentCountMock: vi.fn(),
  categoryFindUniqueMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { count: documentCountMock, findMany: documentFindManyMock },
    documentDraft: { count: draftCountMock },
    documentFavorite: { count: favoriteCountMock },
    documentRecent: { count: recentCountMock },
    documentCategory: { findUnique: categoryFindUniqueMock },
  },
}));

vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));

import { GET } from "@/app/api/admin/documents/bulk-delete/route";

function getReq(qs: string): NextRequest {
  return new NextRequest(
    `http://localhost/api/admin/documents/bulk-delete?${qs}`,
  );
}

describe("GET /api/admin/documents/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1", email: "a@x.com" },
      profile: { role: "admin" },
    });
    documentCountMock.mockResolvedValue(3);
    documentFindManyMock.mockResolvedValue([
      { id: "d1" },
      { id: "d2" },
      { id: "d3" },
    ]);
    draftCountMock.mockResolvedValue(2);
    favoriteCountMock.mockResolvedValue(5);
    recentCountMock.mockResolvedValue(7);
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await GET(getReq("scopeType=all"));
    expect(res.status).toBe(403);
  });

  it("returns counts for scopeType=all with crossSectionCount 0", async () => {
    const res = await GET(getReq("scopeType=all"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      documentCount: 3,
      draftCount: 2,
      favoriteCount: 5,
      recentCount: 7,
      crossSectionCount: 0,
    });
  });

  it("400 when scopeType=section without section", async () => {
    const res = await GET(getReq("scopeType=section"));
    expect(res.status).toBe(400);
  });

  it("400 when category is not in the given section", async () => {
    categoryFindUniqueMock.mockResolvedValue({ id: "c1", section: "sales", title: "X" });
    const res = await GET(getReq("scopeType=category&section=office&categoryId=c1"));
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: FAIL — cannot find module `@/app/api/admin/documents/bulk-delete/route`.

- [ ] **Step 3: Write the route with `GET` only**

Create `src/app/api/admin/documents/bulk-delete/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import {
  buildCrossSectionWhere,
  buildDocumentWhere,
  type BulkDeleteScope,
} from "@/lib/documents/bulk-delete";

const scopeSchema = z
  .object({
    scopeType: z.enum(["all", "section", "category"]),
    section: z.enum(["office", "listing", "sales"]).optional(),
    categoryId: z.string().min(1).optional(),
  })
  .refine(
    (v) =>
      v.scopeType === "all"
        ? !v.section && !v.categoryId
        : v.scopeType === "section"
          ? Boolean(v.section) && !v.categoryId
          : Boolean(v.section) && Boolean(v.categoryId),
    { message: "Invalid scope" },
  );

type ScopeInput = z.infer<typeof scopeSchema>;

type ResolvedScope =
  | { error: NextResponse }
  | { targetSection: string | null; categoryName: string | null };

async function resolveScope(scope: ScopeInput): Promise<ResolvedScope> {
  if (scope.scopeType === "all") {
    return { targetSection: null, categoryName: null };
  }
  if (scope.scopeType === "section") {
    return { targetSection: scope.section!, categoryName: null };
  }
  const cat = await prisma.documentCategory.findUnique({
    where: { id: scope.categoryId! },
  });
  if (!cat || cat.section !== scope.section) {
    return {
      error: NextResponse.json(
        { error: "Category not found in that section", field: "categoryId" },
        { status: 400 },
      ),
    };
  }
  return { targetSection: scope.section!, categoryName: cat.title };
}

function asScope(s: ScopeInput): BulkDeleteScope {
  if (s.scopeType === "all") return { scopeType: "all" };
  if (s.scopeType === "section") {
    return { scopeType: "section", section: s.section! };
  }
  return { scopeType: "category", section: s.section!, categoryId: s.categoryId! };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const sp = request.nextUrl.searchParams;
  const parsed = scopeSchema.safeParse({
    scopeType: sp.get("scopeType"),
    section: sp.get("section") ?? undefined,
    categoryId: sp.get("categoryId") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid scope", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const meta = await resolveScope(parsed.data);
  if ("error" in meta) return meta.error;

  const scope = asScope(parsed.data);
  const where = buildDocumentWhere(scope);
  const matched = await prisma.document.findMany({
    where,
    select: { id: true },
  });
  const ids = matched.map((m) => m.id);
  const documentCount = await prisma.document.count({ where });

  const [draftCount, favoriteCount, recentCount] = await Promise.all([
    prisma.documentDraft.count({ where: { documentId: { in: ids } } }),
    prisma.documentFavorite.count({ where: { documentId: { in: ids } } }),
    prisma.documentRecent.count({ where: { documentId: { in: ids } } }),
  ]);

  const crossSectionCount =
    scope.scopeType === "all"
      ? 0
      : await prisma.document.count({
          where: buildCrossSectionWhere(where, meta.targetSection!),
        });

  return NextResponse.json({
    documentCount,
    draftCount,
    favoriteCount,
    recentCount,
    crossSectionCount,
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/documents/bulk-delete/route.ts src/app/api/admin/documents/bulk-delete/route.test.ts
git commit -m "feat(documents): bulk-delete preview endpoint"
```

---

## Task 4: Execute endpoint — `POST` (delete + audit, no storage yet)

**Files:**
- Modify: `src/app/api/admin/documents/bulk-delete/route.ts`
- Modify: `src/app/api/admin/documents/bulk-delete/route.test.ts`

- [ ] **Step 1: Add failing tests for POST**

Append these mocks to the `vi.hoisted(...)` block in `route.test.ts` (add the four new names alongside the existing ones):

```ts
  deleteManyMock: vi.fn(),
  logCreateMock: vi.fn(),
  logUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
```

Extend the `vi.mock("@/lib/prisma", ...)` factory `prisma` object with:

```ts
    documentDeletionLog: { create: logCreateMock, update: logUpdateMock },
    $transaction: transactionMock,
```

Update the import line to also import `POST`:

```ts
import { GET, POST } from "@/app/api/admin/documents/bulk-delete/route";
```

Add this helper and test suite to the file:

```ts
function postReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/documents/bulk-delete", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/admin/documents/bulk-delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1", email: "a@x.com" },
      profile: { role: "admin" },
    });
    documentFindManyMock.mockResolvedValue([
      { id: "d1", storageProvider: "local", storageKey: null },
      { id: "d2", storageProvider: "supabase", storageKey: "k2" },
    ]);
    documentCountMock.mockResolvedValue(0);
    draftCountMock.mockResolvedValue(1);
    favoriteCountMock.mockResolvedValue(2);
    recentCountMock.mockResolvedValue(3);
    logCreateMock.mockResolvedValue({ id: "log-1" });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentDraft: { count: draftCountMock },
          documentFavorite: { count: favoriteCountMock },
          documentRecent: { count: recentCountMock },
          document: { deleteMany: deleteManyMock },
          documentDeletionLog: { create: logCreateMock },
        });
      }
      return undefined;
    });
    deleteManyMock.mockResolvedValue({ count: 2 });
  });

  it("400 on wrong confirmation phrase", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE" }),
    );
    expect(res.status).toBe(400);
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("409 and a blocked log row when actual exceeds expected", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 1, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(409);
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          outcome: "blocked_scope_changed",
          documentCount: 0,
          expectedDocumentCount: 1,
          actualDocumentCount: 2,
        }),
      }),
    );
    expect(deleteManyMock).not.toHaveBeenCalled();
  });

  it("deletes, writes an executed log row, and returns counts", async () => {
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: { id: { in: ["d1", "d2"] } },
    });
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "executed", documentCount: 2 }),
      }),
    );
    expect(await res.json()).toEqual(
      expect.objectContaining({ success: true, documentCount: 2 }),
    );
  });

  it("no-op (zero matched) still writes an executed log row with zeros", async () => {
    documentFindManyMock.mockResolvedValue([]);
    deleteManyMock.mockResolvedValue({ count: 0 });
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 0, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(logCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ outcome: "executed", documentCount: 0 }),
      }),
    );
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: FAIL — `POST` is not exported / not a function.

- [ ] **Step 3: Implement `POST` (no storage cleanup yet)**

Append to `src/app/api/admin/documents/bulk-delete/route.ts`. Add `CONFIRMATION_PHRASE` to the existing import from `@/lib/documents/bulk-delete`, then add:

```ts
const executeSchema = scopeSchema.and(
  z.object({
    expectedDocumentCount: z.number().int().nonnegative(),
    confirmationPhrase: z.string(),
  }),
);

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const parsed = executeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { expectedDocumentCount, confirmationPhrase, ...scopeInput } =
    parsed.data;

  if (confirmationPhrase !== CONFIRMATION_PHRASE) {
    return NextResponse.json(
      { error: `Type ${CONFIRMATION_PHRASE} to confirm`, field: "confirmationPhrase" },
      { status: 400 },
    );
  }

  const meta = await resolveScope(scopeInput);
  if ("error" in meta) return meta.error;

  const scope = asScope(scopeInput);
  const where = buildDocumentWhere(scope);
  const matched = await prisma.document.findMany({
    where,
    select: { id: true, storageProvider: true, storageKey: true },
  });
  const ids = matched.map((m) => m.id);
  const actual = ids.length;

  const logBase = {
    adminUserId: auth.user.id,
    adminEmail: auth.user.email ?? null,
    scopeType: scopeInput.scopeType,
    section: scopeInput.section ?? null,
    categoryId: scopeInput.categoryId ?? null,
    categoryName: meta.categoryName,
    expectedDocumentCount,
    actualDocumentCount: actual,
  };

  if (actual > expectedDocumentCount) {
    await prisma.documentDeletionLog.create({
      data: {
        ...logBase,
        outcome: "blocked_scope_changed",
        documentCount: 0,
        draftCount: 0,
        favoriteCount: 0,
        recentCount: 0,
        crossSectionCount: 0,
        storageRequested: 0,
        storageRemoved: 0,
        storageErrors: 0,
        storageErrorKeys: [],
      },
    });
    return NextResponse.json(
      {
        error: "The library changed since you reviewed it. Re-check the numbers.",
        code: "SCOPE_CHANGED",
        expected: expectedDocumentCount,
        actual,
      },
      { status: 409 },
    );
  }

  const crossSectionCount =
    scope.scopeType === "all"
      ? 0
      : await prisma.document.count({
          where: buildCrossSectionWhere(where, meta.targetSection!),
        });

  const storageKeys = matched
    .filter((m) => m.storageProvider === "supabase" && m.storageKey)
    .map((m) => m.storageKey as string);

  const result = await prisma.$transaction(
    async (tx) => {
      const [draftCount, favoriteCount, recentCount] = await Promise.all([
        tx.documentDraft.count({ where: { documentId: { in: ids } } }),
        tx.documentFavorite.count({ where: { documentId: { in: ids } } }),
        tx.documentRecent.count({ where: { documentId: { in: ids } } }),
      ]);
      const del = await tx.document.deleteMany({ where: { id: { in: ids } } });
      const log = await tx.documentDeletionLog.create({
        data: {
          ...logBase,
          outcome: "executed",
          documentCount: del.count,
          draftCount,
          favoriteCount,
          recentCount,
          crossSectionCount,
          storageRequested: storageKeys.length,
          storageRemoved: 0,
          storageErrors: 0,
          storageErrorKeys: [],
        },
      });
      return { logId: log.id, deleted: del.count, draftCount, favoriteCount, recentCount };
    },
    { timeout: 50_000 },
  );

  return NextResponse.json({
    success: true,
    documentCount: result.deleted,
    draftCount: result.draftCount,
    favoriteCount: result.favoriteCount,
    recentCount: result.recentCount,
    storageRequested: storageKeys.length,
    storageRemoved: 0,
    storageErrors: 0,
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: PASS (all GET + POST tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/documents/bulk-delete/route.ts src/app/api/admin/documents/bulk-delete/route.test.ts
git commit -m "feat(documents): bulk-delete execute endpoint with audit log"
```

---

## Task 5: Post-commit Supabase storage cleanup

**Files:**
- Modify: `src/app/api/admin/documents/bulk-delete/route.ts`
- Modify: `src/app/api/admin/documents/bulk-delete/route.test.ts`

- [ ] **Step 1: Add a failing test for storage removal**

In `route.test.ts`, replace the `vi.mock("@/lib/supabase/admin", ...)` line with a controllable mock and add a test. Add to `vi.hoisted`: `storageRemoveMock: vi.fn()`. Replace the supabase mock with:

```ts
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: { from: () => ({ remove: storageRemoveMock }) },
  }),
}));
```

Add this test inside the `describe("POST ...")` block:

```ts
  it("removes supabase storage objects and patches the log", async () => {
    storageRemoveMock.mockResolvedValue({ data: {}, error: null });
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(storageRemoveMock).toHaveBeenCalledWith(["k2"]);
    expect(logUpdateMock).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { storageRemoved: 1, storageErrors: 0, storageErrorKeys: [] },
    });
    expect(await res.json()).toEqual(
      expect.objectContaining({ storageRequested: 1, storageRemoved: 1 }),
    );
  });

  it("records failed storage keys when removal errors", async () => {
    storageRemoveMock.mockResolvedValue({ data: null, error: { message: "boom" } });
    const res = await POST(
      postReq({ scopeType: "all", expectedDocumentCount: 2, confirmationPhrase: "DELETE ALL" }),
    );
    expect(res.status).toBe(200);
    expect(logUpdateMock).toHaveBeenCalledWith({
      where: { id: "log-1" },
      data: { storageRemoved: 0, storageErrors: 1, storageErrorKeys: ["k2"] },
    });
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: FAIL — `storageRemoveMock` / `logUpdateMock` not called.

- [ ] **Step 3: Add the storage cleanup block**

In `route.ts`, add `chunk` to the `@/lib/documents/bulk-delete` import. Also add `createAdminClient` import at the top:

```ts
import { createAdminClient } from "@/lib/supabase/admin";
```

Replace the final `return NextResponse.json({ success: true, ... storageRemoved: 0, storageErrors: 0 });` in `POST` with:

```ts
  let storageRemoved = 0;
  let storageErrors = 0;
  const storageErrorKeys: string[] = [];

  if (storageKeys.length > 0) {
    const supabase = createAdminClient();
    for (const batch of chunk(storageKeys, 100)) {
      const { error } = await supabase.storage.from("documents").remove(batch);
      if (error) {
        storageErrors += batch.length;
        storageErrorKeys.push(...batch);
      } else {
        storageRemoved += batch.length;
      }
    }
    await prisma.documentDeletionLog.update({
      where: { id: result.logId },
      data: { storageRemoved, storageErrors, storageErrorKeys },
    });
  }

  return NextResponse.json({
    success: true,
    documentCount: result.deleted,
    draftCount: result.draftCount,
    favoriteCount: result.favoriteCount,
    recentCount: result.recentCount,
    storageRequested: storageKeys.length,
    storageRemoved,
    storageErrors,
  });
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/app/api/admin/documents/bulk-delete/route.test.ts`
Expected: PASS (all GET + POST + storage tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/documents/bulk-delete/route.ts src/app/api/admin/documents/bulk-delete/route.test.ts
git commit -m "feat(documents): bulk-delete supabase storage cleanup"
```

---

## Task 6: "Bulk delete" button in the organize toolbar

**Files:**
- Modify: `src/components/admin/documents-organize/organize-toolbar.tsx`
- Test: `src/components/admin/documents-organize/organize-toolbar.test.tsx` (create)

- [ ] **Step 1: Write the failing test**

Create `src/components/admin/documents-organize/organize-toolbar.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OrganizeToolbar } from "./organize-toolbar";

function setup(preview = false) {
  const onBulkDelete = vi.fn();
  render(
    <OrganizeToolbar
      preview={preview}
      onPreviewChange={() => {}}
      search=""
      onSearchChange={() => {}}
      onAddDocument={() => {}}
      onBulkDelete={onBulkDelete}
    />,
  );
  return { onBulkDelete };
}

describe("OrganizeToolbar", () => {
  it("calls onBulkDelete when the Bulk delete button is clicked", async () => {
    const { onBulkDelete } = setup(false);
    await userEvent.click(screen.getByRole("button", { name: /bulk delete/i }));
    expect(onBulkDelete).toHaveBeenCalledOnce();
  });

  it("hides Bulk delete in preview mode", () => {
    setup(true);
    expect(
      screen.queryByRole("button", { name: /bulk delete/i }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/components/admin/documents-organize/organize-toolbar.test.tsx`
Expected: FAIL — `onBulkDelete` is not a prop / button not found.

- [ ] **Step 3: Add the prop and button**

Edit `src/components/admin/documents-organize/organize-toolbar.tsx`. Update the import line and interface, and add the button.

Change the lucide import line to:

```tsx
import { Plus, Search, Trash2 } from "lucide-react";
```

Add `onBulkDelete: () => void;` to `OrganizeToolbarProps`, add `onBulkDelete` to the destructured params, and inside the `{!preview && ( … )}` region place a Bulk delete button immediately before the existing "Add Document" button. Replace the existing `{!preview && (` block with:

```tsx
        {!preview && (
          <>
            <button
              type="button"
              onClick={onBulkDelete}
              className="inline-flex items-center gap-1.5 h-9 px-3 border border-crimson-200 text-crimson-700 rounded-lg text-sm font-semibold hover:bg-crimson-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
            >
              <Trash2 className="h-4 w-4" />
              Bulk delete
            </button>
            <button
              type="button"
              onClick={onAddDocument}
              className="inline-flex items-center gap-1.5 h-9 px-3 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
            >
              <Plus className="h-4 w-4" />
              Add Document
            </button>
          </>
        )}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/components/admin/documents-organize/organize-toolbar.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/documents-organize/organize-toolbar.tsx src/components/admin/documents-organize/organize-toolbar.test.tsx
git commit -m "feat(documents): bulk delete toolbar button"
```

---

## Task 7: Bulk delete dialog

**Files:**
- Create: `src/app/admin/documents/bulk-delete-dialog.tsx`
- Test: `src/app/admin/documents/bulk-delete-dialog.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/app/admin/documents/bulk-delete-dialog.test.tsx`:

```tsx
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const adminFetchMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/admin-fetch", () => ({
  adminFetch: adminFetchMock,
  AdminFetchError: class AdminFetchError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.status = status;
    }
  },
}));

import { BulkDeleteDialog } from "./bulk-delete-dialog";

const preview = {
  documentCount: 4,
  draftCount: 2,
  favoriteCount: 1,
  recentCount: 3,
  crossSectionCount: 0,
};

describe("BulkDeleteDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    adminFetchMock.mockResolvedValue(preview);
  });

  it("loads the preview and shows the document count", async () => {
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={() => {}} categories={[]} />,
    );
    await waitFor(() =>
      expect(screen.getByText(/4 documents/i)).toBeInTheDocument(),
    );
  });

  it("keeps confirm disabled until 'DELETE ALL' is typed", async () => {
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={() => {}} categories={[]} />,
    );
    await waitFor(() => screen.getByText(/4 documents/i));
    const confirm = screen.getByRole("button", { name: /delete permanently/i });
    expect(confirm).toBeDisabled();
    await userEvent.type(screen.getByPlaceholderText("DELETE ALL"), "DELETE ALL");
    expect(confirm).toBeEnabled();
  });

  it("calls onDeleted after a successful delete", async () => {
    const onDeleted = vi.fn();
    adminFetchMock
      .mockResolvedValueOnce(preview)
      .mockResolvedValueOnce({ success: true, documentCount: 4 });
    render(
      <BulkDeleteDialog open onClose={() => {}} onDeleted={onDeleted} categories={[]} />,
    );
    await waitFor(() => screen.getByText(/4 documents/i));
    await userEvent.type(screen.getByPlaceholderText("DELETE ALL"), "DELETE ALL");
    await userEvent.click(screen.getByRole("button", { name: /delete permanently/i }));
    await waitFor(() =>
      expect(onDeleted).toHaveBeenCalledWith({ success: true, documentCount: 4 }),
    );
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/app/admin/documents/bulk-delete-dialog.test.tsx`
Expected: FAIL — cannot find module `./bulk-delete-dialog`.

- [ ] **Step 3: Implement the dialog**

Create `src/app/admin/documents/bulk-delete-dialog.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";
import { adminFetch, AdminFetchError } from "@/lib/admin-fetch";
import {
  CONFIRMATION_PHRASE,
  type BulkDeletePreview,
  type BulkDeleteResult,
} from "@/lib/documents/bulk-delete";
import type { DocumentSection } from "@/types/document-library";

interface CategoryOption {
  id: string;
  title: string;
  section: DocumentSection;
}

interface BulkDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onDeleted: (result: BulkDeleteResult) => void;
  categories: CategoryOption[];
}

const SECTIONS: Array<{ key: DocumentSection; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
];

export function BulkDeleteDialog({
  open,
  onClose,
  onDeleted,
  categories,
}: BulkDeleteDialogProps) {
  const [mode, setMode] = useState<"all" | "scoped">("all");
  const [section, setSection] = useState<DocumentSection>("office");
  const [categoryId, setCategoryId] = useState<string>("");
  const [preview, setPreview] = useState<BulkDeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [typed, setTyped] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const sectionCategories = useMemo(
    () => categories.filter((c) => c.section === section),
    [categories, section],
  );

  const query = useMemo(() => {
    if (mode === "all") return "scopeType=all";
    if (categoryId) {
      return `scopeType=category&section=${section}&categoryId=${encodeURIComponent(categoryId)}`;
    }
    return `scopeType=section&section=${section}`;
  }, [mode, section, categoryId]);

  useEffect(() => {
    if (open) {
      setMode("all");
      setSection("office");
      setCategoryId("");
      setTyped("");
      setMessage(null);
    }
  }, [open]);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    setMessage(null);
    try {
      const data = await adminFetch<BulkDeletePreview>(
        `/api/admin/documents/bulk-delete?${query}`,
      );
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setMessage((err as Error).message);
    } finally {
      setLoadingPreview(false);
    }
  }, [query]);

  useEffect(() => {
    if (open) void loadPreview();
  }, [open, loadPreview]);

  const matches = typed === CONFIRMATION_PHRASE;
  const hasDocs = (preview?.documentCount ?? 0) > 0;
  const canConfirm = matches && hasDocs && !submitting && !loadingPreview;

  const handleConfirm = async () => {
    if (!canConfirm || !preview) return;
    setSubmitting(true);
    setMessage(null);
    const payload =
      mode === "all"
        ? { scopeType: "all" as const }
        : categoryId
          ? { scopeType: "category" as const, section, categoryId }
          : { scopeType: "section" as const, section };
    try {
      const result = await adminFetch<BulkDeleteResult>(
        "/api/admin/documents/bulk-delete",
        {
          method: "POST",
          body: JSON.stringify({
            ...payload,
            expectedDocumentCount: preview.documentCount,
            confirmationPhrase: typed,
          }),
        },
      );
      onDeleted(result);
    } catch (err) {
      if (err instanceof AdminFetchError && err.status === 409) {
        setTyped("");
        setMessage(
          "The library changed since you reviewed it. The numbers were refreshed — please re-check and confirm again.",
        );
        await loadPreview();
      } else {
        setMessage((err as Error).message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) onClose();
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-md w-full p-6 shadow-elevated z-50">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-crimson-50 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-crimson-600" />
            </div>
            <div className="flex-1">
              <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
                Bulk delete documents
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-slate-600 mt-1">
                This permanently deletes documents from the library. It cannot
                be undone.
              </AlertDialog.Description>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="scope"
                checked={mode === "all"}
                onChange={() => setMode("all")}
              />
              Entire library
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name="scope"
                checked={mode === "scoped"}
                onChange={() => setMode("scoped")}
              />
              Scoped
            </label>

            {mode === "scoped" && (
              <div className="pl-6 space-y-2">
                <select
                  value={section}
                  onChange={(e) => {
                    setSection(e.target.value as DocumentSection);
                    setCategoryId("");
                  }}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full h-9 px-2 text-sm border border-slate-200 rounded-lg"
                >
                  <option value="">All categories in section</option>
                  {sectionCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4 text-sm text-slate-600">
            {loadingPreview && <p>Calculating…</p>}
            {!loadingPreview && preview && (
              <>
                <p>
                  This permanently deletes{" "}
                  <span className="font-semibold text-crimson-700">
                    {preview.documentCount} documents
                  </span>
                  .
                </p>
                {preview.crossSectionCount > 0 && (
                  <p className="mt-1 text-crimson-700 font-medium">
                    {preview.crossSectionCount} of these also appear in other
                    sections and will be removed there too.
                  </p>
                )}
                <p className="mt-1">
                  This also destroys{" "}
                  <span className="font-semibold">
                    {preview.draftCount} agent drafts
                  </span>{" "}
                  (agents&apos; in-progress, filled-in documents),{" "}
                  {preview.favoriteCount} favorites, and {preview.recentCount}{" "}
                  recents.
                </p>
              </>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 mt-4">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
              Type{" "}
              <span className="font-mono text-crimson-600 normal-case tracking-normal">
                {CONFIRMATION_PHRASE}
              </span>{" "}
              to confirm
            </p>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={CONFIRMATION_PHRASE}
              disabled={submitting}
              autoComplete="off"
              spellCheck={false}
              className={`mt-2 font-mono text-sm h-10 px-3 w-full border rounded-lg focus:outline-none focus:ring-2 focus:ring-crimson-600 ${
                matches ? "border-crimson-300 bg-crimson-50/30" : "border-slate-200"
              }`}
            />
          </div>

          {message && (
            <p className="mt-3 text-sm text-crimson-700">{message}</p>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {submitting && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {submitting ? "Deleting…" : "Delete permanently"}
            </button>
            <button
              onClick={onClose}
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

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/app/admin/documents/bulk-delete-dialog.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/documents/bulk-delete-dialog.tsx src/app/admin/documents/bulk-delete-dialog.test.tsx
git commit -m "feat(documents): bulk delete confirmation dialog"
```

---

## Task 8: Wire the dialog into `OrganizeView`

**Files:**
- Modify: `src/app/admin/documents/organize-view.tsx`

- [ ] **Step 1: Add imports**

After the existing `ConfirmDialog` import (line 10), add:

```tsx
import { BulkDeleteDialog } from "./bulk-delete-dialog";
import type { BulkDeleteResult } from "@/lib/documents/bulk-delete";
```

- [ ] **Step 2: Add dialog state**

After the `const [deleting, setDeleting] = useState(false);` line (line 58), add:

```tsx
  const [bulkOpen, setBulkOpen] = useState(false);
```

- [ ] **Step 3: Add the success handler**

After the `confirmDelete` `useCallback` block (ends line 274), add:

```tsx
  const handleBulkDeleted = useCallback(
    (result: BulkDeleteResult) => {
      setBulkOpen(false);
      toast(
        `Deleted ${result.documentCount} document(s)` +
          (result.storageErrors > 0
            ? ` — ${result.storageErrors} storage object(s) failed to remove`
            : ""),
        result.storageErrors > 0 ? "error" : "success",
      );
      refetch();
    },
    [refetch, toast],
  );
```

- [ ] **Step 4: Pass `onBulkDelete` to the toolbar**

Replace the `<OrganizeToolbar … />` element (lines 357-366) by adding the prop:

```tsx
      <OrganizeToolbar
        preview={preview}
        onPreviewChange={(next) => {
          setPreview(next);
          if (next) setSearch("");
        }}
        search={search}
        onSearchChange={setSearch}
        onAddDocument={handleAddDocument}
        onBulkDelete={() => setBulkOpen(true)}
      />
```

- [ ] **Step 5: Render the dialog**

Immediately before the closing `</div>` of the component's returned tree (right after the `<ConfirmDialog … />` element, before line 445's `</div>`), add:

```tsx
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
```

- [ ] **Step 6: Verify types and the toolbar test still pass**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: exits 0.

Run: `npx vitest run src/components/admin/documents-organize/organize-toolbar.test.tsx`
Expected: PASS.

> If `tsc` reports that `drawerCategories` items lack `title`/`section`, open `src/lib/documents-organize/shapers.ts`, inspect the `categoryToItem` return shape, and map the correct field names (the dialog only needs `{ id, title, section }`). Fix the `.map(...)` accordingly and re-run `tsc`.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/documents/organize-view.tsx
git commit -m "feat(documents): wire bulk delete dialog into admin documents"
```

---

## Task 9: Full verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full verification suite**

Run: `npm run verify`
Expected: lint, type-check, `vitest run`, and `next build` all succeed.

- [ ] **Step 2: Fix any failures**

If anything fails, fix it, re-run `npm run verify` until green. Commit fixes:

```bash
git add -A
git commit -m "fix(documents): address bulk delete verification issues"
```

- [ ] **Step 3: Manual browser smoke test (chrome-devtools MCP)**

Start the dev server if not running, then in the browser: open `/admin/documents`, click **Bulk delete**, pick a scope, confirm the live count renders, type `DELETE ALL`, and verify the confirm button enables. (Do not execute a real delete against production unless intended.)

---

## Self-Review

**Spec coverage:**
- Hard delete + cascades → Task 4 (`deleteMany` cascades via schema relations). ✓
- Scope all/section/category → Task 2 (`buildDocumentWhere`) + Tasks 3/4. ✓
- `requireAdminApi` gate → Tasks 3/4 (tested 403). ✓
- `DELETE ALL` typed confirm (server + client) → Task 2 constant, Task 4 server check, Task 7 input. ✓
- Live count + cross-section disclosure → Task 3 (`crossSectionCount`), Task 7 (UI). ✓
- Count-drift 409 + blocked log row → Task 4. ✓
- Dedicated audit table incl. no-ops & blocked → Task 1 model, Task 4 (executed + blocked, zero no-op). ✓
- Post-commit chunked Supabase cleanup + failed keys → Task 5. ✓
- `Document`-library-only, never `TransactionDocument` → only `prisma.document` is queried; no `transactionDocument` reference anywhere. ✓
- 50s transaction timeout → Task 4 (`{ timeout: 50_000 }`). ✓
- Built-in docs deleted, no modal warning → dialog (Task 7) has no local/seed note by design. ✓

**Placeholder scan:** No TBD/TODO; every code step is complete. Task 8 Step 6 includes a concrete fallback instruction (not a placeholder) for one shaper field-name uncertainty.

**Type consistency:** `BulkDeleteScope`, `BulkDeletePreview`, `BulkDeleteResult`, `CONFIRMATION_PHRASE`, `buildDocumentWhere`, `buildCrossSectionWhere`, `chunk` are defined in Task 2 and used with identical signatures in Tasks 3/4/7/8. Route mock prisma delegate names match the real `prisma` usage.
