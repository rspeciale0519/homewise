# Admin Document Library — Drag-and-Drop Organize View — Implementation Plan

> **For agentic workers:** This plan follows the project's `/git-workflow-planning` flow (CLAUDE.md Rule 9). Each phase ends with `/git-workflow-planning:checkpoint <n> <description>`. After the final phase, run `/git-workflow-planning:finish`. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Replace the admin document library UI with a WYSIWYG organize view that mirrors the agent-facing Document Library and lets admins drag-and-drop to position documents (within a category, across categories within a section) and categories (within a section), plus a "Preview as agent" toggle.

**Architecture:**
- Admin-only client-side component tree at `/admin/documents` using `@dnd-kit/core` + `@dnd-kit/sortable` (already installed).
- Four new API endpoints for tree fetch and reorder/move operations; existing CRUD endpoints reused unchanged.
- Optimistic updates with snap-back on API failure; auto-save on every drop.
- Legacy table UI archived (not deleted) per CLAUDE.md Rule 1.
- No Prisma schema changes — `DocumentCategory.sortOrder` and `DocumentCategoryMembership.sortOrder` are already sufficient.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript (strict), Prisma, Zod, `@dnd-kit/*`, Radix UI, Tailwind, Vitest + React Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-04-18-admin-document-organize-design.md`

---

## Branch setup (run BEFORE any code changes)

```
/git-workflow-planning:start feature admin-document-organize
```

This creates branch `feature/admin-document-organize` off `develop`.

---

## Phase 1 — Foundation: types, pure reorder logic, client API wrappers

**Goal:** Get the type contracts and pure utility functions in place first. Everything downstream depends on these.

**Files:**
- Modify: `src/app/admin/documents/types.ts`
- Create: `src/lib/documents-organize/reorder.ts`
- Create: `src/lib/documents-organize/reorder.test.ts`
- Create: `src/lib/documents-organize/api.ts`
- Create: `archive/admin/documents/README.md`

### Task 1.1 — Extend `types.ts` with organize-view types

**Files:**
- Modify: `src/app/admin/documents/types.ts`

- [ ] **Step 1: Add new types at the bottom of the file**

Append to `src/app/admin/documents/types.ts`:

```ts
export interface AdminDocumentInCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  published: boolean;
  quickAccess: boolean;
  external: boolean;
  url: string | null;
  storageKey: string | null;
  storageProvider: string;
  mimeType: string | null;
  membership: { categoryId: string; sortOrder: number };
}

export interface AdminCategoryTree {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  section: DocumentSection;
  sortOrder: number;
  documents: AdminDocumentInCategory[];
}

export interface OrganizeTree {
  sections: {
    office: { categories: AdminCategoryTree[] };
    listing: { categories: AdminCategoryTree[] };
    sales: { categories: AdminCategoryTree[] };
  };
}
```

- [ ] **Step 2: Verify type-check passes**

Run: `npm run type-check`
Expected: passes with no errors.

### Task 1.2 — Write failing tests for pure reorder functions

**Files:**
- Create: `src/lib/documents-organize/reorder.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/lib/documents-organize/reorder.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  computeCategoryReorder,
  computeDocReorder,
  computeCrossCategoryMove,
} from "./reorder";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  OrganizeTree,
} from "@/app/admin/documents/types";

function makeDoc(
  id: string,
  categoryId: string,
  sortOrder: number,
  overrides: Partial<AdminDocumentInCategory> = {},
): AdminDocumentInCategory {
  return {
    id,
    slug: id,
    name: id,
    description: null,
    published: true,
    quickAccess: false,
    external: false,
    url: null,
    storageKey: `${id}.pdf`,
    storageProvider: "supabase",
    mimeType: "application/pdf",
    membership: { categoryId, sortOrder },
    ...overrides,
  };
}

function makeCat(
  id: string,
  section: "office" | "listing" | "sales",
  sortOrder: number,
  documents: AdminDocumentInCategory[] = [],
): AdminCategoryTree {
  return {
    id,
    slug: id,
    title: id,
    description: null,
    section,
    sortOrder,
    documents,
  };
}

describe("computeCategoryReorder", () => {
  it("moves a category from position 0 to 2 within a section", () => {
    const cats = [
      makeCat("a", "office", 0),
      makeCat("b", "office", 1),
      makeCat("c", "office", 2),
    ];
    const result = computeCategoryReorder(cats, 0, 2);
    expect(result.map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(result.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it("is a no-op when fromIndex equals toIndex", () => {
    const cats = [
      makeCat("a", "office", 0),
      makeCat("b", "office", 1),
    ];
    const result = computeCategoryReorder(cats, 1, 1);
    expect(result.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("moves a category from end to start", () => {
    const cats = [
      makeCat("a", "office", 0),
      makeCat("b", "office", 1),
      makeCat("c", "office", 2),
    ];
    const result = computeCategoryReorder(cats, 2, 0);
    expect(result.map((c) => c.id)).toEqual(["c", "a", "b"]);
    expect(result.map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe("computeDocReorder", () => {
  it("moves a doc within a category", () => {
    const docs = [
      makeDoc("d1", "cat", 0),
      makeDoc("d2", "cat", 1),
      makeDoc("d3", "cat", 2),
    ];
    const result = computeDocReorder(docs, 0, 2);
    expect(result.map((d) => d.id)).toEqual(["d2", "d3", "d1"]);
    expect(result.map((d) => d.membership.sortOrder)).toEqual([0, 1, 2]);
  });

  it("returns identity on same-index drop", () => {
    const docs = [makeDoc("d1", "cat", 0), makeDoc("d2", "cat", 1)];
    const result = computeDocReorder(docs, 0, 0);
    expect(result.map((d) => d.id)).toEqual(["d1", "d2"]);
  });
});

describe("computeCrossCategoryMove", () => {
  const tree: OrganizeTree = {
    sections: {
      office: {
        categories: [
          makeCat("catA", "office", 0, [
            makeDoc("d1", "catA", 0),
            makeDoc("d2", "catA", 1),
          ]),
          makeCat("catB", "office", 1, [makeDoc("d3", "catB", 0)]),
        ],
      },
      listing: { categories: [] },
      sales: { categories: [] },
    },
  };

  it("moves a doc from catA to catB at index 1", () => {
    const result = computeCrossCategoryMove(tree, "d1", "catA", "catB", 1);
    const catA = result.sections.office.categories.find((c) => c.id === "catA")!;
    const catB = result.sections.office.categories.find((c) => c.id === "catB")!;
    expect(catA.documents.map((d) => d.id)).toEqual(["d2"]);
    expect(catA.documents[0].membership.sortOrder).toBe(0);
    expect(catB.documents.map((d) => d.id)).toEqual(["d3", "d1"]);
    expect(catB.documents[1].membership.categoryId).toBe("catB");
    expect(catB.documents[1].membership.sortOrder).toBe(1);
  });

  it("moves a doc from catA to empty category", () => {
    const tree2: OrganizeTree = {
      sections: {
        office: {
          categories: [
            makeCat("catA", "office", 0, [makeDoc("d1", "catA", 0)]),
            makeCat("catEmpty", "office", 1, []),
          ],
        },
        listing: { categories: [] },
        sales: { categories: [] },
      },
    };
    const result = computeCrossCategoryMove(tree2, "d1", "catA", "catEmpty", 0);
    const catA = result.sections.office.categories.find((c) => c.id === "catA")!;
    const catEmpty = result.sections.office.categories.find(
      (c) => c.id === "catEmpty",
    )!;
    expect(catA.documents).toEqual([]);
    expect(catEmpty.documents.map((d) => d.id)).toEqual(["d1"]);
    expect(catEmpty.documents[0].membership.categoryId).toBe("catEmpty");
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run: `npm run test:run -- src/lib/documents-organize/reorder.test.ts`
Expected: FAIL — module `./reorder` cannot be found.

### Task 1.3 — Implement pure reorder functions

**Files:**
- Create: `src/lib/documents-organize/reorder.ts`

- [ ] **Step 1: Create `reorder.ts`**

Create `src/lib/documents-organize/reorder.ts`:

```ts
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  OrganizeTree,
} from "@/app/admin/documents/types";

function moveArrayItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to) return arr.slice();
  const copy = arr.slice();
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

export function computeCategoryReorder(
  categories: AdminCategoryTree[],
  fromIndex: number,
  toIndex: number,
): AdminCategoryTree[] {
  return moveArrayItem(categories, fromIndex, toIndex).map((c, i) => ({
    ...c,
    sortOrder: i,
  }));
}

export function computeDocReorder(
  docs: AdminDocumentInCategory[],
  fromIndex: number,
  toIndex: number,
): AdminDocumentInCategory[] {
  return moveArrayItem(docs, fromIndex, toIndex).map((d, i) => ({
    ...d,
    membership: { ...d.membership, sortOrder: i },
  }));
}

export function computeCrossCategoryMove(
  tree: OrganizeTree,
  documentId: string,
  fromCategoryId: string,
  toCategoryId: string,
  toIndex: number,
): OrganizeTree {
  const sections = tree.sections;
  const updatedSections = { ...sections };

  (Object.keys(sections) as Array<keyof typeof sections>).forEach((key) => {
    const section = sections[key];
    const fromCat = section.categories.find((c) => c.id === fromCategoryId);
    const toCat = section.categories.find((c) => c.id === toCategoryId);
    if (!fromCat && !toCat) return;

    const movingDoc = fromCat?.documents.find((d) => d.id === documentId);
    if (!movingDoc) return;

    const updatedCategories = section.categories.map((cat) => {
      if (cat.id === fromCategoryId) {
        const remaining = cat.documents
          .filter((d) => d.id !== documentId)
          .map((d, i) => ({
            ...d,
            membership: { ...d.membership, sortOrder: i },
          }));
        return { ...cat, documents: remaining };
      }
      if (cat.id === toCategoryId) {
        const insert: AdminDocumentInCategory = {
          ...movingDoc,
          membership: { categoryId: toCategoryId, sortOrder: toIndex },
        };
        const existingWithoutMoving = cat.documents.filter(
          (d) => d.id !== documentId,
        );
        const next = existingWithoutMoving.slice();
        next.splice(toIndex, 0, insert);
        const reindexed = next.map((d, i) => ({
          ...d,
          membership: { ...d.membership, sortOrder: i },
        }));
        return { ...cat, documents: reindexed };
      }
      return cat;
    });

    updatedSections[key] = { categories: updatedCategories };
  });

  return { sections: updatedSections };
}
```

- [ ] **Step 2: Run tests to confirm they pass**

Run: `npm run test:run -- src/lib/documents-organize/reorder.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 3: Type-check passes**

Run: `npm run type-check`
Expected: no errors.

### Task 1.4 — Create client API wrappers

**Files:**
- Create: `src/lib/documents-organize/api.ts`

- [ ] **Step 1: Create `api.ts`**

Create `src/lib/documents-organize/api.ts`:

```ts
import { adminFetch } from "@/lib/admin-fetch";
import type {
  DocumentSection,
  OrganizeTree,
} from "@/app/admin/documents/types";

export function fetchOrganizeTree(): Promise<OrganizeTree> {
  return adminFetch<OrganizeTree>("/api/admin/documents/organize");
}

export function reorderCategories(
  section: DocumentSection,
  categoryIds: string[],
): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/categories/reorder", {
    method: "PATCH",
    body: JSON.stringify({ section, categoryIds }),
  });
}

export function reorderMemberships(
  categoryId: string,
  documentIds: string[],
): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/memberships/reorder", {
    method: "PATCH",
    body: JSON.stringify({ categoryId, documentIds }),
  });
}

export function moveMembership(args: {
  documentId: string;
  fromCategoryId: string;
  toCategoryId: string;
  toIndex: number;
}): Promise<{ ok: true }> {
  return adminFetch("/api/admin/documents/memberships/move", {
    method: "PATCH",
    body: JSON.stringify(args),
  });
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 1.5 — Seed archive folder README

**Files:**
- Create: `archive/admin/documents/README.md`

- [ ] **Step 1: Create the archive folder README**

Create `archive/admin/documents/README.md`:

```md
# Archived: Admin Documents Legacy Table UI

Original location: `src/app/admin/documents/documents-admin-view.tsx`

Archived on: 2026-04-18
Replaced by: `src/app/admin/documents/organize-view.tsx` (drag-and-drop organize view).

Archived per CLAUDE.md Rule 1 (never delete — move to archive). See spec:
`docs/superpowers/specs/2026-04-18-admin-document-organize-design.md`.
```

- [ ] **Step 2: Verify path created**

Run: `ls archive/admin/documents/`
Expected: `README.md` present. The actual legacy file will be moved here in Phase 5.

### Phase 1 checkpoint

After roadmap update per CLAUDE.md Rule 7, run:

```
/git-workflow-planning:checkpoint 1 types, pure reorder logic, and client API wrappers
```

---

## Phase 2 — API endpoints (TDD)

**Goal:** Implement the four server endpoints with integration tests. Every endpoint is validated inside a Prisma transaction.

**Files:**
- Create: `src/app/api/admin/documents/organize/route.ts`
- Create: `src/app/api/admin/documents/organize/route.test.ts`
- Create: `src/app/api/admin/documents/categories/reorder/route.ts`
- Create: `src/app/api/admin/documents/categories/reorder/route.test.ts`
- Create: `src/app/api/admin/documents/memberships/reorder/route.ts`
- Create: `src/app/api/admin/documents/memberships/reorder/route.test.ts`
- Create: `src/app/api/admin/documents/memberships/move/route.ts`
- Create: `src/app/api/admin/documents/memberships/move/route.test.ts`

### Task 2.1 — Write failing test for `GET /api/admin/documents/organize`

**Files:**
- Create: `src/app/api/admin/documents/organize/route.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/app/api/admin/documents/organize/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireAdminApiMock,
  categoryFindManyMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategory: { findMany: categoryFindManyMock },
  },
}));

import { GET } from "@/app/api/admin/documents/organize/route";

describe("GET /api/admin/documents/organize", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
  });

  it("returns 403 for non-admin users", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
      }),
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns the tree grouped by section with drafts and empty categories included", async () => {
    categoryFindManyMock.mockResolvedValue([
      {
        id: "catOffice1",
        slug: "office-general",
        title: "Office General",
        description: null,
        section: "office",
        sortOrder: 0,
        documents: [
          {
            sortOrder: 0,
            categoryId: "catOffice1",
            document: {
              id: "doc1",
              slug: "doc1",
              name: "Doc 1",
              description: null,
              published: true,
              quickAccess: false,
              external: false,
              url: null,
              storageKey: "doc1.pdf",
              storageProvider: "supabase",
              mimeType: "application/pdf",
            },
          },
        ],
      },
      {
        id: "catOfficeEmpty",
        slug: "office-empty",
        title: "Office Empty",
        description: null,
        section: "office",
        sortOrder: 1,
        documents: [],
      },
      {
        id: "catListing1",
        slug: "listing-forms",
        title: "Listing Forms",
        description: null,
        section: "listing",
        sortOrder: 0,
        documents: [
          {
            sortOrder: 0,
            categoryId: "catListing1",
            document: {
              id: "doc2",
              slug: "doc2",
              name: "Doc 2 Draft",
              description: null,
              published: false,
              quickAccess: false,
              external: false,
              url: null,
              storageKey: "doc2.pdf",
              storageProvider: "supabase",
              mimeType: "application/pdf",
            },
          },
        ],
      },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sections.office.categories).toHaveLength(2);
    expect(body.sections.office.categories[1].documents).toEqual([]);
    expect(body.sections.listing.categories[0].documents[0].published).toBe(
      false,
    );
    expect(body.sections.sales.categories).toEqual([]);
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npm run test:run -- src/app/api/admin/documents/organize/route.test.ts`
Expected: FAIL — route module not found.

### Task 2.2 — Implement `GET /api/admin/documents/organize`

**Files:**
- Create: `src/app/api/admin/documents/organize/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/documents/organize/route.ts`:

```ts
import { NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import type {
  AdminCategoryTree,
  DocumentSection,
  OrganizeTree,
} from "@/app/admin/documents/types";

const SECTIONS: DocumentSection[] = ["office", "listing", "sales"];

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const categories = await prisma.documentCategory.findMany({
    orderBy: [{ section: "asc" }, { sortOrder: "asc" }],
    include: {
      documents: {
        orderBy: { sortOrder: "asc" },
        include: { document: true },
      },
    },
  });

  const shapedCategories: AdminCategoryTree[] = categories.map((c) => ({
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    section: c.section as DocumentSection,
    sortOrder: c.sortOrder,
    documents: c.documents.map((m) => ({
      id: m.document.id,
      slug: m.document.slug,
      name: m.document.name,
      description: m.document.description,
      published: m.document.published,
      quickAccess: m.document.quickAccess,
      external: m.document.external,
      url: m.document.url,
      storageKey: m.document.storageKey,
      storageProvider: m.document.storageProvider,
      mimeType: m.document.mimeType,
      membership: { categoryId: c.id, sortOrder: m.sortOrder },
    })),
  }));

  const tree: OrganizeTree = {
    sections: SECTIONS.reduce(
      (acc, s) => {
        acc[s] = {
          categories: shapedCategories.filter((c) => c.section === s),
        };
        return acc;
      },
      {} as OrganizeTree["sections"],
    ),
  };

  return NextResponse.json(tree);
}
```

- [ ] **Step 2: Confirm tests pass**

Run: `npm run test:run -- src/app/api/admin/documents/organize/route.test.ts`
Expected: PASS.

### Task 2.3 — Write failing tests for `PATCH /api/admin/documents/categories/reorder`

**Files:**
- Create: `src/app/api/admin/documents/categories/reorder/route.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/app/api/admin/documents/categories/reorder/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  categoryFindManyMock,
  transactionMock,
  categoryUpdateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  categoryFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  categoryUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategory: {
      findMany: categoryFindManyMock,
      update: categoryUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/categories/reorder/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/documents/categories/reorder", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

describe("PATCH /api/admin/documents/categories/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategory: { update: categoryUpdateMock },
        });
      }
      return undefined;
    });
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await PATCH(makeRequest({ section: "office", categoryIds: [] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when submitted ids don't match the section's current set", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["a"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when an id belongs to a different section", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "listing" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["a", "b"] }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 on duplicate ids", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["a", "a"] }),
    );
    expect(res.status).toBe(400);
  });

  it("updates sortOrder in a transaction on success", async () => {
    categoryFindManyMock.mockResolvedValue([
      { id: "a", section: "office" },
      { id: "b", section: "office" },
      { id: "c", section: "office" },
    ]);
    const res = await PATCH(
      makeRequest({ section: "office", categoryIds: ["c", "a", "b"] }),
    );
    expect(res.status).toBe(200);
    expect(categoryUpdateMock).toHaveBeenCalledTimes(3);
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { id: "c" },
      data: { sortOrder: 0 },
    });
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(2, {
      where: { id: "a" },
      data: { sortOrder: 1 },
    });
    expect(categoryUpdateMock).toHaveBeenNthCalledWith(3, {
      where: { id: "b" },
      data: { sortOrder: 2 },
    });
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npm run test:run -- src/app/api/admin/documents/categories/reorder/route.test.ts`
Expected: FAIL — route not found.

### Task 2.4 — Implement `PATCH /api/admin/documents/categories/reorder`

**Files:**
- Create: `src/app/api/admin/documents/categories/reorder/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/documents/categories/reorder/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  section: z.enum(["office", "listing", "sales"]),
  categoryIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { section, categoryIds } = parsed.data;

  const uniqueIds = new Set(categoryIds);
  if (uniqueIds.size !== categoryIds.length) {
    return NextResponse.json(
      { error: "Duplicate category ids" },
      { status: 400 },
    );
  }

  const existing = await prisma.documentCategory.findMany({
    where: { section },
    select: { id: true, section: true },
  });

  if (existing.length !== categoryIds.length) {
    return NextResponse.json(
      { error: "Submitted ids do not match the current section" },
      { status: 400 },
    );
  }
  const existingSet = new Set(existing.map((e) => e.id));
  for (const id of categoryIds) {
    if (!existingSet.has(id)) {
      return NextResponse.json(
        { error: `Category ${id} is not in section ${section}` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < categoryIds.length; i++) {
      await tx.documentCategory.update({
        where: { id: categoryIds[i] },
        data: { sortOrder: i },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Confirm tests pass**

Run: `npm run test:run -- src/app/api/admin/documents/categories/reorder/route.test.ts`
Expected: PASS.

### Task 2.5 — Write failing tests for `PATCH /api/admin/documents/memberships/reorder`

**Files:**
- Create: `src/app/api/admin/documents/memberships/reorder/route.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/app/api/admin/documents/memberships/reorder/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  membershipFindManyMock,
  transactionMock,
  membershipUpdateMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  transactionMock: vi.fn(),
  membershipUpdateMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategoryMembership: {
      findMany: membershipFindManyMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/memberships/reorder/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/reorder",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

describe("PATCH /api/admin/documents/memberships/reorder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategoryMembership: { update: membershipUpdateMock },
        });
      }
      return undefined;
    });
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await PATCH(makeRequest({ categoryId: "c", documentIds: [] }));
    expect(res.status).toBe(403);
  });

  it("returns 400 when submitted docs do not match current members", async () => {
    membershipFindManyMock.mockResolvedValue([
      { documentId: "d1", categoryId: "c" },
      { documentId: "d2", categoryId: "c" },
    ]);
    const res = await PATCH(
      makeRequest({ categoryId: "c", documentIds: ["d1"] }),
    );
    expect(res.status).toBe(400);
  });

  it("updates membership sortOrder on success", async () => {
    membershipFindManyMock.mockResolvedValue([
      { documentId: "d1", categoryId: "c" },
      { documentId: "d2", categoryId: "c" },
      { documentId: "d3", categoryId: "c" },
    ]);
    const res = await PATCH(
      makeRequest({ categoryId: "c", documentIds: ["d3", "d1", "d2"] }),
    );
    expect(res.status).toBe(200);
    expect(membershipUpdateMock).toHaveBeenCalledTimes(3);
    expect(membershipUpdateMock).toHaveBeenNthCalledWith(1, {
      where: { documentId_categoryId: { documentId: "d3", categoryId: "c" } },
      data: { sortOrder: 0 },
    });
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npm run test:run -- src/app/api/admin/documents/memberships/reorder/route.test.ts`
Expected: FAIL — route not found.

### Task 2.6 — Implement `PATCH /api/admin/documents/memberships/reorder`

**Files:**
- Create: `src/app/api/admin/documents/memberships/reorder/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/documents/memberships/reorder/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  categoryId: z.string().min(1),
  documentIds: z.array(z.string().min(1)),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { categoryId, documentIds } = parsed.data;

  const uniqueDocs = new Set(documentIds);
  if (uniqueDocs.size !== documentIds.length) {
    return NextResponse.json(
      { error: "Duplicate document ids" },
      { status: 400 },
    );
  }

  const existing = await prisma.documentCategoryMembership.findMany({
    where: { categoryId },
    select: { documentId: true },
  });

  if (existing.length !== documentIds.length) {
    return NextResponse.json(
      { error: "Submitted ids do not match current members" },
      { status: 400 },
    );
  }
  const existingSet = new Set(existing.map((e) => e.documentId));
  for (const id of documentIds) {
    if (!existingSet.has(id)) {
      return NextResponse.json(
        { error: `Document ${id} is not a member of category ${categoryId}` },
        { status: 400 },
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < documentIds.length; i++) {
      await tx.documentCategoryMembership.update({
        where: {
          documentId_categoryId: {
            documentId: documentIds[i],
            categoryId,
          },
        },
        data: { sortOrder: i },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Confirm tests pass**

Run: `npm run test:run -- src/app/api/admin/documents/memberships/reorder/route.test.ts`
Expected: PASS.

### Task 2.7 — Write failing tests for `PATCH /api/admin/documents/memberships/move`

**Files:**
- Create: `src/app/api/admin/documents/memberships/move/route.test.ts`

- [ ] **Step 1: Create the test file**

Create `src/app/api/admin/documents/memberships/move/route.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const {
  requireAdminApiMock,
  membershipFindUniqueMock,
  membershipFindManyMock,
  membershipDeleteMock,
  membershipCreateMock,
  membershipUpdateMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAdminApiMock: vi.fn(),
  membershipFindUniqueMock: vi.fn(),
  membershipFindManyMock: vi.fn(),
  membershipDeleteMock: vi.fn(),
  membershipCreateMock: vi.fn(),
  membershipUpdateMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("@/lib/admin-api", () => ({
  requireAdminApi: requireAdminApiMock,
  isError: (r: { error?: unknown }) => "error" in r,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    documentCategoryMembership: {
      findUnique: membershipFindUniqueMock,
      findMany: membershipFindManyMock,
      delete: membershipDeleteMock,
      create: membershipCreateMock,
      update: membershipUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

import { PATCH } from "@/app/api/admin/documents/memberships/move/route";

function makeRequest(body: unknown): NextRequest {
  return new NextRequest(
    "http://localhost/api/admin/documents/memberships/move",
    { method: "PATCH", body: JSON.stringify(body) },
  );
}

describe("PATCH /api/admin/documents/memberships/move", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminApiMock.mockResolvedValue({
      user: { id: "admin-1" },
      profile: { role: "admin" },
    });
    transactionMock.mockImplementation(async (cb: unknown) => {
      if (typeof cb === "function") {
        return cb({
          documentCategoryMembership: {
            findUnique: membershipFindUniqueMock,
            findMany: membershipFindManyMock,
            delete: membershipDeleteMock,
            create: membershipCreateMock,
            update: membershipUpdateMock,
          },
        });
      }
      return undefined;
    });
  });

  it("rejects non-admin with 403", async () => {
    requireAdminApiMock.mockResolvedValue({
      error: new Response(null, { status: 403 }),
    });
    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 409 when document is not a member of fromCategory", async () => {
    membershipFindUniqueMock.mockResolvedValueOnce(null);
    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(409);
  });

  it("merges when document is already in toCategory (deletes from, updates to)", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "a" })
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "b" });
    membershipFindManyMock
      .mockResolvedValueOnce([{ documentId: "d1", categoryId: "b", sortOrder: 2 }])
      .mockResolvedValueOnce([{ documentId: "d1", categoryId: "b", sortOrder: 2 }]);

    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(200);
    expect(membershipDeleteMock).toHaveBeenCalledWith({
      where: {
        documentId_categoryId: { documentId: "d1", categoryId: "a" },
      },
    });
    expect(membershipCreateMock).not.toHaveBeenCalled();
  });

  it("moves (delete from + create to) when doc is not yet in toCategory", async () => {
    membershipFindUniqueMock
      .mockResolvedValueOnce({ documentId: "d1", categoryId: "a" })
      .mockResolvedValueOnce(null);
    membershipFindManyMock
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ documentId: "d1", categoryId: "b", sortOrder: 0 }]);

    const res = await PATCH(
      makeRequest({
        documentId: "d1",
        fromCategoryId: "a",
        toCategoryId: "b",
        toIndex: 0,
      }),
    );
    expect(res.status).toBe(200);
    expect(membershipDeleteMock).toHaveBeenCalledWith({
      where: {
        documentId_categoryId: { documentId: "d1", categoryId: "a" },
      },
    });
    expect(membershipCreateMock).toHaveBeenCalledWith({
      data: {
        documentId: "d1",
        categoryId: "b",
        sortOrder: 0,
      },
    });
  });
});
```

- [ ] **Step 2: Confirm tests fail**

Run: `npm run test:run -- src/app/api/admin/documents/memberships/move/route.test.ts`
Expected: FAIL — route not found.

### Task 2.8 — Implement `PATCH /api/admin/documents/memberships/move`

**Files:**
- Create: `src/app/api/admin/documents/memberships/move/route.ts`

- [ ] **Step 1: Create the route**

Create `src/app/api/admin/documents/memberships/move/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const schema = z.object({
  documentId: z.string().min(1),
  fromCategoryId: z.string().min(1),
  toCategoryId: z.string().min(1),
  toIndex: z.number().int().min(0),
});

export async function PATCH(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { documentId, fromCategoryId, toCategoryId, toIndex } = parsed.data;

  if (fromCategoryId === toCategoryId) {
    return NextResponse.json(
      { error: "Use reorder endpoint for same-category moves" },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      const fromMembership = await tx.documentCategoryMembership.findUnique({
        where: {
          documentId_categoryId: { documentId, categoryId: fromCategoryId },
        },
      });
      if (!fromMembership) {
        throw new NotMemberError(
          `Document ${documentId} is not a member of ${fromCategoryId}`,
        );
      }

      const existingInTo = await tx.documentCategoryMembership.findUnique({
        where: {
          documentId_categoryId: { documentId, categoryId: toCategoryId },
        },
      });

      await tx.documentCategoryMembership.delete({
        where: {
          documentId_categoryId: { documentId, categoryId: fromCategoryId },
        },
      });

      if (!existingInTo) {
        await tx.documentCategoryMembership.create({
          data: {
            documentId,
            categoryId: toCategoryId,
            sortOrder: toIndex,
          },
        });
      }

      const fromMembers = await tx.documentCategoryMembership.findMany({
        where: { categoryId: fromCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      for (let i = 0; i < fromMembers.length; i++) {
        await tx.documentCategoryMembership.update({
          where: {
            documentId_categoryId: {
              documentId: fromMembers[i].documentId,
              categoryId: fromCategoryId,
            },
          },
          data: { sortOrder: i },
        });
      }

      const toMembers = await tx.documentCategoryMembership.findMany({
        where: { categoryId: toCategoryId },
        orderBy: { sortOrder: "asc" },
      });
      const reordered = reindexWithInsertion(toMembers, documentId, toIndex);
      for (let i = 0; i < reordered.length; i++) {
        await tx.documentCategoryMembership.update({
          where: {
            documentId_categoryId: {
              documentId: reordered[i].documentId,
              categoryId: toCategoryId,
            },
          },
          data: { sortOrder: i },
        });
      }
    });
  } catch (err) {
    if (err instanceof NotMemberError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    throw err;
  }

  return NextResponse.json({ ok: true });
}

class NotMemberError extends Error {}

function reindexWithInsertion(
  members: Array<{ documentId: string; sortOrder: number }>,
  movedDocId: string,
  targetIndex: number,
): Array<{ documentId: string }> {
  const without = members.filter((m) => m.documentId !== movedDocId);
  const clamped = Math.min(Math.max(targetIndex, 0), without.length);
  const ordered = [
    ...without.slice(0, clamped).map((m) => ({ documentId: m.documentId })),
    { documentId: movedDocId },
    ...without.slice(clamped).map((m) => ({ documentId: m.documentId })),
  ];
  return ordered;
}
```

- [ ] **Step 2: Confirm tests pass**

Run: `npm run test:run -- src/app/api/admin/documents/memberships/move/route.test.ts`
Expected: PASS.

- [ ] **Step 3: All Phase 2 tests pass together**

Run: `npm run test:run -- src/app/api/admin/documents`
Expected: PASS across all new route tests.

### Phase 2 checkpoint

After roadmap update per CLAUDE.md Rule 7:

```
/git-workflow-planning:checkpoint 2 admin documents organize + reorder + move API endpoints
```

---

## Phase 3 — Core UI components

**Goal:** Build the presentational layer — cards, menus, category headers, placeholders — before composing them into the top-level view in Phase 4.

**Files:**
- Create: `src/components/admin/documents-organize/dnd-context.tsx`
- Create: `src/components/admin/documents-organize/document-card.tsx`
- Create: `src/components/admin/documents-organize/document-card-menu.tsx`
- Create: `src/components/admin/documents-organize/category-header.tsx`
- Create: `src/components/admin/documents-organize/empty-category-placeholder.tsx`
- Create: `src/components/admin/documents-organize/category-column.tsx`

### Task 3.1 — Create `DndContextProvider` wrapper

**Files:**
- Create: `src/components/admin/documents-organize/dnd-context.tsx`

- [ ] **Step 1: Create the wrapper**

Create `src/components/admin/documents-organize/dnd-context.tsx`:

```tsx
"use client";

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import type { ReactNode } from "react";

interface DndContextProviderProps {
  children: ReactNode;
  onDragStart?: (event: DragStartEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onDragCancel?: () => void;
}

export function DndContextProvider({
  children,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: DndContextProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 400, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={onDragCancel}
    >
      {children}
    </DndContext>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 3.2 — Create `DocumentCardMenu` (ellipsis dropdown)

**Files:**
- Create: `src/components/admin/documents-organize/document-card-menu.tsx`

- [ ] **Step 1: Create the menu**

Create `src/components/admin/documents-organize/document-card-menu.tsx`:

```tsx
"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Eye,
  MoreVertical,
  Pencil,
  Star,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Trash2,
} from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentSection,
} from "@/app/admin/documents/types";

interface DocumentCardMenuProps {
  document: AdminDocumentInCategory;
  currentCategoryId: string;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onEdit: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDelete: (doc: AdminDocumentInCategory) => void;
}

const neutralItem =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-navy-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-slate-50 data-[highlighted]:text-navy-700";
const destructiveItem =
  "flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700";

const SECTION_LABELS: Record<DocumentSection, string> = {
  office: "Office",
  listing: "Listing",
  sales: "Sales",
};

export function DocumentCardMenu({
  document,
  currentCategoryId,
  targetCategories,
  onEdit,
  onTogglePublish,
  onToggleQuickAccess,
  onMoveTo,
  onOpenInViewer,
  onDelete,
}: DocumentCardMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${document.name}`}
          onClick={(e) => e.stopPropagation()}
          className="h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[220px] z-50"
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onEdit(document);
            }}
            className={neutralItem}
          >
            <Pencil className="h-4 w-4" />
            Edit…
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onTogglePublish(document);
            }}
            className={neutralItem}
          >
            {document.published ? (
              <>
                <XCircle className="h-4 w-4" />
                Unpublish
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Publish
              </>
            )}
          </DropdownMenu.Item>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onToggleQuickAccess(document);
            }}
            className={neutralItem}
          >
            <Star
              className={`h-4 w-4 ${
                document.quickAccess ? "fill-amber-500 text-amber-500" : ""
              }`}
            />
            {document.quickAccess
              ? "Remove from Quick Access"
              : "Add to Quick Access"}
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={neutralItem}>
              <ArrowRight className="h-4 w-4" />
              Move to…
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                sideOffset={6}
                className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[220px] z-50"
              >
                {(["office", "listing", "sales"] as DocumentSection[]).map(
                  (section) => (
                    <DropdownMenu.Sub key={section}>
                      <DropdownMenu.SubTrigger className={neutralItem}>
                        {SECTION_LABELS[section]}
                      </DropdownMenu.SubTrigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.SubContent
                          sideOffset={6}
                          className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[220px] z-50"
                        >
                          {targetCategories[section].length === 0 ? (
                            <div className="px-4 py-2.5 text-xs text-slate-400">
                              No categories — add one first.
                            </div>
                          ) : (
                            targetCategories[section].map((cat) => {
                              const disabled = cat.id === currentCategoryId;
                              return (
                                <DropdownMenu.Item
                                  key={cat.id}
                                  disabled={disabled}
                                  onSelect={(e) => {
                                    e.preventDefault();
                                    if (disabled) return;
                                    onMoveTo(
                                      document,
                                      currentCategoryId,
                                      cat.id,
                                    );
                                  }}
                                  className={`${neutralItem} ${
                                    disabled ? "opacity-40 cursor-default" : ""
                                  }`}
                                >
                                  {cat.title}
                                </DropdownMenu.Item>
                              );
                            })
                          )}
                        </DropdownMenu.SubContent>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Sub>
                  ),
                )}
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onOpenInViewer(document);
            }}
            className={neutralItem}
          >
            <Eye className="h-4 w-4" />
            View in viewer
          </DropdownMenu.Item>

          <DropdownMenu.Separator className="h-px bg-slate-100 my-1" />

          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onDelete(document);
            }}
            className={destructiveItem}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 3.3 — Create `DocumentCard`

**Files:**
- Create: `src/components/admin/documents-organize/document-card.tsx`

- [ ] **Step 1: Create the card**

Create `src/components/admin/documents-organize/document-card.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";
import { DocumentCardMenu } from "./document-card-menu";

interface DocumentCardProps {
  document: AdminDocumentInCategory;
  currentCategoryId: string;
  preview: boolean;
  searchMatches: boolean;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onCardClick: (doc: AdminDocumentInCategory) => void;
  onEdit: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDelete: (doc: AdminDocumentInCategory) => void;
}

function dragId(documentId: string, categoryId: string): string {
  return `doc::${categoryId}::${documentId}`;
}

export function DocumentCard(props: DocumentCardProps) {
  const {
    document,
    currentCategoryId,
    preview,
    searchMatches,
    targetCategories,
    onCardClick,
    onEdit,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDelete,
  } = props;

  const id = dragId(document.id, currentCategoryId);
  const sortable = useSortable({
    id,
    disabled: preview || !searchMatches,
    data: {
      type: "document",
      documentId: document.id,
      fromCategoryId: currentCategoryId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : searchMatches ? 1 : 0.3,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="group relative flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-white hover:border-crimson-200 hover:bg-crimson-50/30 transition-all duration-200"
      onClick={() => onCardClick(document)}
    >
      {!preview && (
        <button
          type="button"
          aria-label={`Drag to reorder ${document.name}`}
          className="absolute left-1.5 top-1.5 h-6 w-6 inline-flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-500 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          {...sortable.attributes}
          {...sortable.listeners}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      )}

      <div className="shrink-0 mt-0.5">
        <div className="h-9 w-9 rounded-lg bg-navy-50 flex items-center justify-center">
          <svg
            className="h-4 w-4 text-navy-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-700">
          {document.name}
          {!document.published && !preview && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold text-slate-500 bg-slate-100">
              Draft
            </span>
          )}
          {document.quickAccess && !preview && (
            <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold text-amber-700 bg-amber-50">
              Quick
            </span>
          )}
        </p>
        {document.description && (
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {document.description}
          </p>
        )}
      </div>

      {!preview && (
        <div
          className="shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <DocumentCardMenu
            document={document}
            currentCategoryId={currentCategoryId}
            targetCategories={targetCategories}
            onEdit={onEdit}
            onTogglePublish={onTogglePublish}
            onToggleQuickAccess={onToggleQuickAccess}
            onMoveTo={onMoveTo}
            onOpenInViewer={onOpenInViewer}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}

export { dragId as documentDragId };
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 3.4 — Create `CategoryHeader`

**Files:**
- Create: `src/components/admin/documents-organize/category-header.tsx`

- [ ] **Step 1: Create the header**

Create `src/components/admin/documents-organize/category-header.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Pencil } from "lucide-react";
import type { AdminCategoryTree } from "@/app/admin/documents/types";

interface CategoryHeaderProps {
  category: AdminCategoryTree;
  preview: boolean;
  onEdit: (category: AdminCategoryTree) => void;
}

function categoryDragId(categoryId: string): string {
  return `cat::${categoryId}`;
}

export function CategoryHeader({
  category,
  preview,
  onEdit,
}: CategoryHeaderProps) {
  const sortable = useSortable({
    id: categoryDragId(category.id),
    disabled: preview,
    data: { type: "category", categoryId: category.id },
  });

  const style = {
    transform: CSS.Transform.toString(sortable.transform),
    transition: sortable.transition,
    opacity: sortable.isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={sortable.setNodeRef}
      style={style}
      className="group flex items-center gap-3 mb-5 relative"
    >
      {!preview && (
        <button
          type="button"
          aria-label={`Drag to reorder ${category.title}`}
          className="h-6 w-6 inline-flex items-center justify-center rounded text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-500 cursor-grab active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
          {...sortable.attributes}
          {...sortable.listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}

      <div className="h-1.5 w-1.5 rounded-full bg-crimson-600" />

      <h2 className="font-serif text-xl font-semibold text-navy-700">
        {category.title}
      </h2>

      <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
        {category.documents.length}
      </span>

      {!preview && (
        <button
          type="button"
          aria-label={`Edit category ${category.title}`}
          onClick={() => onEdit(category)}
          className="ml-auto h-7 w-7 inline-flex items-center justify-center rounded-md text-slate-300 opacity-0 group-hover:opacity-100 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export { categoryDragId };
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 3.5 — Create `EmptyCategoryPlaceholder`

**Files:**
- Create: `src/components/admin/documents-organize/empty-category-placeholder.tsx`

- [ ] **Step 1: Create the placeholder**

Create `src/components/admin/documents-organize/empty-category-placeholder.tsx`:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import { Plus } from "lucide-react";

interface EmptyCategoryPlaceholderProps {
  categoryId: string;
  onAddDocument: () => void;
}

export function EmptyCategoryPlaceholder({
  categoryId,
  onAddDocument,
}: EmptyCategoryPlaceholderProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `empty::${categoryId}`,
    data: { type: "empty-category", categoryId },
  });

  return (
    <button
      type="button"
      ref={setNodeRef}
      onClick={onAddDocument}
      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed text-sm transition-colors ${
        isOver
          ? "border-crimson-400 bg-crimson-50/50 text-crimson-700"
          : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-500"
      }`}
    >
      <Plus className="h-4 w-4" />
      Drop documents here or click to add
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 3.6 — Create `CategoryColumn`

**Files:**
- Create: `src/components/admin/documents-organize/category-column.tsx`

- [ ] **Step 1: Create the column**

Create `src/components/admin/documents-organize/category-column.tsx`:

```tsx
"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
} from "@/app/admin/documents/types";
import { CategoryHeader } from "./category-header";
import {
  DocumentCard,
  documentDragId,
} from "./document-card";
import { EmptyCategoryPlaceholder } from "./empty-category-placeholder";

interface CategoryColumnProps {
  category: AdminCategoryTree;
  preview: boolean;
  search: string;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onEditCategory: (category: AdminCategoryTree) => void;
  onAddDocumentToCategory: (category: AdminCategoryTree) => void;
  onCardClick: (doc: AdminDocumentInCategory) => void;
  onEditDoc: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDeleteDoc: (doc: AdminDocumentInCategory) => void;
}

function matchesSearch(
  doc: AdminDocumentInCategory,
  search: string,
): boolean {
  if (!search.trim()) return true;
  const q = search.trim().toLowerCase();
  return (
    doc.name.toLowerCase().includes(q) ||
    doc.slug.toLowerCase().includes(q)
  );
}

export function CategoryColumn(props: CategoryColumnProps) {
  const {
    category,
    preview,
    search,
    targetCategories,
    onEditCategory,
    onAddDocumentToCategory,
    onCardClick,
    onEditDoc,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDeleteDoc,
  } = props;

  const visibleDocs = preview
    ? category.documents.filter((d) => d.published)
    : category.documents;

  const sortableIds = visibleDocs.map((d) =>
    documentDragId(d.id, category.id),
  );

  const isEmptyInPreview = preview && visibleDocs.length === 0;
  if (isEmptyInPreview) {
    return null;
  }

  return (
    <section>
      <CategoryHeader
        category={category}
        preview={preview}
        onEdit={onEditCategory}
      />

      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        {visibleDocs.length === 0 && !preview ? (
          <EmptyCategoryPlaceholder
            categoryId={category.id}
            onAddDocument={() => onAddDocumentToCategory(category)}
          />
        ) : (
          <div className="grid gap-3 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {visibleDocs.map((doc) => (
              <DocumentCard
                key={doc.id}
                document={doc}
                currentCategoryId={category.id}
                preview={preview}
                searchMatches={matchesSearch(doc, search)}
                targetCategories={targetCategories}
                onCardClick={onCardClick}
                onEdit={onEditDoc}
                onTogglePublish={onTogglePublish}
                onToggleQuickAccess={onToggleQuickAccess}
                onMoveTo={onMoveTo}
                onOpenInViewer={onOpenInViewer}
                onDelete={onDeleteDoc}
              />
            ))}
          </div>
        )}
      </SortableContext>
    </section>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Phase 3 checkpoint

After roadmap update per CLAUDE.md Rule 7:

```
/git-workflow-planning:checkpoint 3 organize view card, header, column, and menu components
```

---

## Phase 4 — Composition: toolbar, section board, top-level organize view

**Goal:** Compose the components from Phase 3 into a working admin view with state management, API calls, and optimistic updates.

**Files:**
- Create: `src/components/admin/documents-organize/preview-toggle.tsx`
- Create: `src/components/admin/documents-organize/organize-toolbar.tsx`
- Create: `src/components/admin/documents-organize/section-board.tsx`
- Create: `src/app/admin/documents/organize-view.tsx`

### Task 4.1 — Create `PreviewToggle`

**Files:**
- Create: `src/components/admin/documents-organize/preview-toggle.tsx`

- [ ] **Step 1: Create the toggle**

Create `src/components/admin/documents-organize/preview-toggle.tsx`:

```tsx
"use client";

import { Eye, EyeOff } from "lucide-react";

interface PreviewToggleProps {
  value: boolean;
  onChange: (next: boolean) => void;
}

export function PreviewToggle({ value, onChange }: PreviewToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-medium transition-colors border ${
        value
          ? "bg-navy-600 text-white border-navy-600 hover:bg-navy-700"
          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
      }`}
    >
      {value ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      {value ? "Exit preview" : "Preview as agent"}
    </button>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 4.2 — Create `OrganizeToolbar`

**Files:**
- Create: `src/components/admin/documents-organize/organize-toolbar.tsx`

- [ ] **Step 1: Create the toolbar**

Create `src/components/admin/documents-organize/organize-toolbar.tsx`:

```tsx
"use client";

import { Plus, Search } from "lucide-react";
import { PreviewToggle } from "./preview-toggle";

interface OrganizeToolbarProps {
  preview: boolean;
  onPreviewChange: (next: boolean) => void;
  search: string;
  onSearchChange: (next: string) => void;
  onAddDocument: () => void;
}

export function OrganizeToolbar({
  preview,
  onPreviewChange,
  search,
  onSearchChange,
  onAddDocument,
}: OrganizeToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or slug…"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          disabled={preview}
          className="w-full h-9 pl-9 pr-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="flex items-center gap-2">
        <PreviewToggle value={preview} onChange={onPreviewChange} />
        {!preview && (
          <button
            type="button"
            onClick={onAddDocument}
            className="inline-flex items-center gap-1.5 h-9 px-3 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 4.3 — Create `SectionBoard`

**Files:**
- Create: `src/components/admin/documents-organize/section-board.tsx`

- [ ] **Step 1: Create the section board**

Create `src/components/admin/documents-organize/section-board.tsx`:

```tsx
"use client";

import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentSection,
} from "@/app/admin/documents/types";
import {
  CategoryColumn,
} from "./category-column";
import { categoryDragId } from "./category-header";

interface SectionBoardProps {
  section: DocumentSection;
  categories: AdminCategoryTree[];
  preview: boolean;
  search: string;
  targetCategories: {
    office: AdminCategoryTree[];
    listing: AdminCategoryTree[];
    sales: AdminCategoryTree[];
  };
  onEditCategory: (c: AdminCategoryTree) => void;
  onAddCategory: () => void;
  onAddDocumentToCategory: (c: AdminCategoryTree) => void;
  onCardClick: (doc: AdminDocumentInCategory) => void;
  onEditDoc: (doc: AdminDocumentInCategory) => void;
  onTogglePublish: (doc: AdminDocumentInCategory) => void;
  onToggleQuickAccess: (doc: AdminDocumentInCategory) => void;
  onMoveTo: (
    doc: AdminDocumentInCategory,
    fromCategoryId: string,
    toCategoryId: string,
  ) => void;
  onOpenInViewer: (doc: AdminDocumentInCategory) => void;
  onDeleteDoc: (doc: AdminDocumentInCategory) => void;
}

export function SectionBoard(props: SectionBoardProps) {
  const {
    categories,
    preview,
    search,
    targetCategories,
    onEditCategory,
    onAddCategory,
    onAddDocumentToCategory,
    onCardClick,
    onEditDoc,
    onTogglePublish,
    onToggleQuickAccess,
    onMoveTo,
    onOpenInViewer,
    onDeleteDoc,
  } = props;

  const visibleCategories = preview
    ? categories.filter((c) => c.documents.some((d) => d.published))
    : categories;

  const categoryIds = visibleCategories.map((c) => categoryDragId(c.id));

  if (preview && visibleCategories.length === 0) {
    return (
      <div className="text-center py-16 text-sm text-slate-400">
        No documents yet.
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <SortableContext
        items={categoryIds}
        strategy={verticalListSortingStrategy}
      >
        {visibleCategories.map((category) => (
          <CategoryColumn
            key={category.id}
            category={category}
            preview={preview}
            search={search}
            targetCategories={targetCategories}
            onEditCategory={onEditCategory}
            onAddDocumentToCategory={onAddDocumentToCategory}
            onCardClick={onCardClick}
            onEditDoc={onEditDoc}
            onTogglePublish={onTogglePublish}
            onToggleQuickAccess={onToggleQuickAccess}
            onMoveTo={onMoveTo}
            onOpenInViewer={onOpenInViewer}
            onDeleteDoc={onDeleteDoc}
          />
        ))}
      </SortableContext>

      {!preview && (
        <button
          type="button"
          onClick={onAddCategory}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-500 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Category
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 4.4 — Create `OrganizeView` (top-level with state + API)

**Files:**
- Create: `src/app/admin/documents/organize-view.tsx`

- [ ] **Step 1: Create the top-level view**

Create `src/app/admin/documents/organize-view.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DragEndEvent } from "@dnd-kit/core";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch, AdminFetchError } from "@/lib/admin-fetch";
import { DocumentDrawer } from "@/components/admin/document-drawer";
import { DocumentCategoryDrawer } from "@/components/admin/document-category-drawer";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import type {
  AdminCategoryTree,
  AdminDocumentInCategory,
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
  OrganizeTree,
} from "./types";
import {
  fetchOrganizeTree,
  moveMembership,
  reorderCategories,
  reorderMemberships,
} from "@/lib/documents-organize/api";
import {
  computeCategoryReorder,
  computeCrossCategoryMove,
  computeDocReorder,
} from "@/lib/documents-organize/reorder";
import { DndContextProvider } from "@/components/admin/documents-organize/dnd-context";
import { OrganizeToolbar } from "@/components/admin/documents-organize/organize-toolbar";
import { SectionBoard } from "@/components/admin/documents-organize/section-board";

const TABS: Array<{ key: DocumentSection; label: string }> = [
  { key: "office", label: "Office" },
  { key: "listing", label: "Listing" },
  { key: "sales", label: "Sales" },
];

function documentToItem(
  doc: AdminDocumentInCategory,
  categories: AdminCategoryTree[],
): DocumentItem {
  const docCats = categories
    .filter((c) => c.documents.some((d) => d.id === doc.id))
    .map((c) => ({ id: c.id, title: c.title, section: c.section }));
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
    quickAccess: doc.quickAccess,
    createdAt: "",
    updatedAt: "",
    categories: docCats,
  };
}

function categoryToItem(c: AdminCategoryTree): DocumentCategoryItem {
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    description: c.description,
    section: c.section,
    sortOrder: c.sortOrder,
    documentCount: c.documents.length,
  };
}

function allCategoriesOfTree(
  tree: OrganizeTree,
): AdminCategoryTree[] {
  return [
    ...tree.sections.office.categories,
    ...tree.sections.listing.categories,
    ...tree.sections.sales.categories,
  ];
}

export function OrganizeView() {
  const { toast } = useToast();
  const router = useRouter();

  const [tree, setTree] = useState<OrganizeTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DocumentSection>("office");
  const [preview, setPreview] = useState(false);
  const [search, setSearch] = useState("");

  const [docDrawerOpen, setDocDrawerOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentItem | null>(null);
  const [addDocSection, setAddDocSection] = useState<DocumentSection>("office");
  const [catDrawerOpen, setCatDrawerOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<DocumentCategoryItem | null>(null);
  const [pendingDelete, setPendingDelete] =
    useState<AdminDocumentInCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const snapshotRef = useRef<OrganizeTree | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const fresh = await fetchOrganizeTree();
      setTree(fresh);
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const targetCategories = useMemo(() => {
    const empty: AdminCategoryTree[] = [];
    if (!tree) {
      return { office: empty, listing: empty, sales: empty };
    }
    return {
      office: tree.sections.office.categories,
      listing: tree.sections.listing.categories,
      sales: tree.sections.sales.categories,
    };
  }, [tree]);

  const flatCategories = useMemo(
    () => (tree ? allCategoriesOfTree(tree) : []),
    [tree],
  );

  const drawerCategories = useMemo(
    () => flatCategories.map(categoryToItem),
    [flatCategories],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      if (!tree) return;
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeData = active.data.current as
        | { type: "document"; documentId: string; fromCategoryId: string }
        | { type: "category"; categoryId: string }
        | undefined;
      const overData = over.data.current as
        | { type: "document"; documentId: string; fromCategoryId: string }
        | { type: "category"; categoryId: string }
        | { type: "empty-category"; categoryId: string }
        | undefined;
      if (!activeData) return;

      snapshotRef.current = tree;

      if (activeData.type === "category") {
        const overCategoryId =
          overData?.type === "category" ? overData.categoryId : null;
        if (!overCategoryId) return;

        const cats = tree.sections[activeTab].categories;
        const fromIdx = cats.findIndex((c) => c.id === activeData.categoryId);
        const toIdx = cats.findIndex((c) => c.id === overCategoryId);
        if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

        const reordered = computeCategoryReorder(cats, fromIdx, toIdx);
        const nextTree: OrganizeTree = {
          sections: {
            ...tree.sections,
            [activeTab]: { categories: reordered },
          },
        };
        setTree(nextTree);

        try {
          await reorderCategories(
            activeTab,
            reordered.map((c) => c.id),
          );
          toast("Order saved", "success");
        } catch (err) {
          setTree(snapshotRef.current);
          toast((err as Error).message, "error");
        }
        return;
      }

      if (activeData.type === "document") {
        const fromCategoryId = activeData.fromCategoryId;
        const toCategoryId =
          overData?.type === "document"
            ? overData.fromCategoryId
            : overData?.type === "category"
              ? overData.categoryId
              : overData?.type === "empty-category"
                ? overData.categoryId
                : null;
        if (!toCategoryId) return;

        if (fromCategoryId === toCategoryId) {
          const cat = tree.sections[activeTab].categories.find(
            (c) => c.id === fromCategoryId,
          );
          if (!cat) return;
          const fromIdx = cat.documents.findIndex(
            (d) => d.id === activeData.documentId,
          );
          const toIdx =
            overData?.type === "document"
              ? cat.documents.findIndex((d) => d.id === overData.documentId)
              : cat.documents.length - 1;
          if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return;

          const reordered = computeDocReorder(cat.documents, fromIdx, toIdx);
          const nextCats = tree.sections[activeTab].categories.map((c) =>
            c.id === fromCategoryId ? { ...c, documents: reordered } : c,
          );
          const nextTree: OrganizeTree = {
            sections: {
              ...tree.sections,
              [activeTab]: { categories: nextCats },
            },
          };
          setTree(nextTree);

          try {
            await reorderMemberships(
              fromCategoryId,
              reordered.map((d) => d.id),
            );
            toast("Order saved", "success");
          } catch (err) {
            setTree(snapshotRef.current);
            toast((err as Error).message, "error");
          }
          return;
        }

        const toCat = tree.sections[activeTab].categories.find(
          (c) => c.id === toCategoryId,
        );
        if (!toCat) return;
        const toIndex =
          overData?.type === "document"
            ? toCat.documents.findIndex((d) => d.id === overData.documentId)
            : toCat.documents.length;
        const clampedIndex = toIndex === -1 ? toCat.documents.length : toIndex;

        const nextTree = computeCrossCategoryMove(
          tree,
          activeData.documentId,
          fromCategoryId,
          toCategoryId,
          clampedIndex,
        );
        setTree(nextTree);

        try {
          await moveMembership({
            documentId: activeData.documentId,
            fromCategoryId,
            toCategoryId,
            toIndex: clampedIndex,
          });
          toast("Moved", "success");
        } catch (err) {
          setTree(snapshotRef.current);
          toast((err as Error).message, "error");
        }
      }
    },
    [tree, activeTab, toast],
  );

  const handleMoveViaMenu = useCallback(
    async (
      doc: AdminDocumentInCategory,
      fromCategoryId: string,
      toCategoryId: string,
    ) => {
      if (!tree) return;
      snapshotRef.current = tree;

      const toCatTree = allCategoriesOfTree(tree).find(
        (c) => c.id === toCategoryId,
      );
      if (!toCatTree) return;
      const nextTree = computeCrossCategoryMove(
        tree,
        doc.id,
        fromCategoryId,
        toCategoryId,
        toCatTree.documents.length,
      );
      setTree(nextTree);

      try {
        await moveMembership({
          documentId: doc.id,
          fromCategoryId,
          toCategoryId,
          toIndex: toCatTree.documents.length,
        });
        toast("Moved", "success");
      } catch (err) {
        setTree(snapshotRef.current);
        toast((err as Error).message, "error");
      }
    },
    [tree, toast],
  );

  const handleTogglePublish = useCallback(
    async (doc: AdminDocumentInCategory) => {
      try {
        await adminFetch(`/api/admin/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify({ published: !doc.published }),
        });
        toast(doc.published ? "Unpublished" : "Published", "success");
        refetch();
      } catch (err) {
        toast((err as Error).message, "error");
      }
    },
    [refetch, toast],
  );

  const handleToggleQuickAccess = useCallback(
    async (doc: AdminDocumentInCategory) => {
      try {
        await adminFetch(`/api/admin/documents/${doc.id}`, {
          method: "PATCH",
          body: JSON.stringify({ quickAccess: !doc.quickAccess }),
        });
        toast(
          doc.quickAccess ? "Removed from Quick Access" : "Added to Quick Access",
          "success",
        );
        refetch();
      } catch (err) {
        toast((err as Error).message, "error");
      }
    },
    [refetch, toast],
  );

  const handleOpenInViewer = useCallback(
    (doc: AdminDocumentInCategory) => {
      window.open(
        `/dashboard/documents/viewer?slug=${encodeURIComponent(doc.slug)}`,
        "_blank",
        "noopener,noreferrer",
      );
    },
    [],
  );

  const handleCardClick = useCallback(
    (doc: AdminDocumentInCategory) => {
      if (preview) {
        const isPdf = (doc.storageKey ?? "").toLowerCase().endsWith(".pdf");
        if (isPdf && !doc.external) {
          router.push(
            `/dashboard/documents/viewer?slug=${encodeURIComponent(doc.slug)}`,
          );
          return;
        }
        const href = doc.external
          ? doc.url ?? "#"
          : `/api/documents/by-slug/${encodeURIComponent(doc.slug)}`;
        window.open(href, "_blank", "noopener,noreferrer");
        return;
      }
      setEditingDoc(documentToItem(doc, flatCategories));
      setDocDrawerOpen(true);
    },
    [preview, flatCategories, router],
  );

  const handleEditDoc = useCallback(
    (doc: AdminDocumentInCategory) => {
      setEditingDoc(documentToItem(doc, flatCategories));
      setDocDrawerOpen(true);
    },
    [flatCategories],
  );

  const handleDeleteDoc = useCallback(
    (doc: AdminDocumentInCategory) => {
      setPendingDelete(doc);
    },
    [],
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/documents/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast("Document deleted", "success");
      setPendingDelete(null);
      refetch();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, refetch, toast]);

  const handleAddDocument = useCallback(() => {
    setEditingDoc(null);
    setAddDocSection(activeTab);
    setDocDrawerOpen(true);
  }, [activeTab]);

  const handleAddDocumentToCategory = useCallback(
    (cat: AdminCategoryTree) => {
      setEditingDoc(null);
      setAddDocSection(cat.section);
      setDocDrawerOpen(true);
    },
    [],
  );

  const handleEditCategory = useCallback(
    (cat: AdminCategoryTree) => {
      setEditingCat(categoryToItem(cat));
      setCatDrawerOpen(true);
    },
    [],
  );

  const handleAddCategory = useCallback(() => {
    setEditingCat(null);
    setCatDrawerOpen(true);
  }, []);

  if (loading || !tree) {
    return (
      <div className="text-center py-16">
        <div className="inline-block h-8 w-8 border-2 border-navy-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const sectionCounts = (
    Object.keys(tree.sections) as DocumentSection[]
  ).reduce(
    (acc, k) => {
      acc[k] = tree.sections[k].categories.reduce(
        (sum, c) =>
          sum +
          (preview
            ? c.documents.filter((d) => d.published).length
            : c.documents.length),
        0,
      );
      return acc;
    },
    {} as Record<DocumentSection, number>,
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl overflow-x-auto w-fit">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
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
                {sectionCounts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      <OrganizeToolbar
        preview={preview}
        onPreviewChange={(next) => {
          setPreview(next);
          if (next) setSearch("");
        }}
        search={search}
        onSearchChange={setSearch}
        onAddDocument={handleAddDocument}
      />

      <div className="xl:hidden text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2">
        Drag-and-drop works best on larger screens. For easier organizing, open
        this page on a tablet or desktop.
      </div>

      <DndContextProvider onDragEnd={handleDragEnd}>
        <SectionBoard
          section={activeTab}
          categories={tree.sections[activeTab].categories}
          preview={preview}
          search={search}
          targetCategories={targetCategories}
          onEditCategory={handleEditCategory}
          onAddCategory={handleAddCategory}
          onAddDocumentToCategory={handleAddDocumentToCategory}
          onCardClick={handleCardClick}
          onEditDoc={handleEditDoc}
          onTogglePublish={handleTogglePublish}
          onToggleQuickAccess={handleToggleQuickAccess}
          onMoveTo={handleMoveViaMenu}
          onOpenInViewer={handleOpenInViewer}
          onDeleteDoc={handleDeleteDoc}
        />
      </DndContextProvider>

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
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes. If `AdminFetchError` import is unused, remove it.

### Phase 4 checkpoint

After roadmap update per CLAUDE.md Rule 7:

```
/git-workflow-planning:checkpoint 4 organize view composition with optimistic drag-and-drop
```

---

## Phase 5 — Wire into page, archive legacy UI

**Goal:** Swap the admin page over to the new view and archive the old table UI per CLAUDE.md Rule 1.

**Files:**
- Modify: `src/app/admin/documents/page.tsx`
- Move: `src/app/admin/documents/documents-admin-view.tsx` → `archive/admin/documents/documents-admin-view.tsx`

### Task 5.1 — Update `page.tsx` to use `OrganizeView`

**Files:**
- Modify: `src/app/admin/documents/page.tsx`

- [ ] **Step 1: Rewrite `page.tsx`**

Overwrite `src/app/admin/documents/page.tsx` with:

```tsx
import type { Metadata } from "next";
import { OrganizeView } from "./organize-view";

export const metadata: Metadata = { title: "Document Library — Admin" };

export default async function DocumentsAdminPage() {
  return (
    <div>
      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">
        Document Library
      </h1>
      <p className="text-slate-500 text-sm mb-8">
        Organize and manage what agents see. Drag cards to reorder within a
        category, or drag across categories within a section.
      </p>
      <OrganizeView />
    </div>
  );
}
```

- [ ] **Step 2: Type-check**

Run: `npm run type-check`
Expected: passes.

### Task 5.2 — Archive legacy view

**Files:**
- Move: `src/app/admin/documents/documents-admin-view.tsx` → `archive/admin/documents/documents-admin-view.tsx`

- [ ] **Step 1: Move the file**

Run (Git-aware move so history is preserved):

```bash
git mv src/app/admin/documents/documents-admin-view.tsx archive/admin/documents/documents-admin-view.tsx
```

- [ ] **Step 2: Verify no remaining imports of the legacy file**

Use the Grep tool to search the codebase for `documents-admin-view` imports.
Expected: zero matches under `src/`.

- [ ] **Step 3: Type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: both pass.

### Phase 5 checkpoint

After roadmap update per CLAUDE.md Rule 7:

```
/git-workflow-planning:checkpoint 5 wire organize view into admin page and archive legacy table UI
```

---

## Phase 6 — Component tests, E2E tests, manual verification

**Goal:** Lock in behavior with RTL tests, run Playwright E2E, and perform a manual verification pass with the Playwright MCP browser (CLAUDE.md Rule 4).

**Files:**
- Create: `src/components/admin/documents-organize/document-card.test.tsx`
- Create: `src/components/admin/documents-organize/organize-toolbar.test.tsx`
- Create: `tests/e2e/admin/documents-organize.spec.ts`

### Task 6.1 — Component test for `DocumentCard` (rendering + ARIA)

**Files:**
- Create: `src/components/admin/documents-organize/document-card.test.tsx`

- [ ] **Step 1: Create the test**

Create `src/components/admin/documents-organize/document-card.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DndContext } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { DocumentCard } from "./document-card";
import type { AdminDocumentInCategory } from "@/app/admin/documents/types";

const baseDoc: AdminDocumentInCategory = {
  id: "doc-1",
  slug: "doc-1",
  name: "Purchase Agreement",
  description: null,
  published: true,
  quickAccess: false,
  external: false,
  url: null,
  storageKey: "doc-1.pdf",
  storageProvider: "supabase",
  mimeType: "application/pdf",
  membership: { categoryId: "cat-a", sortOrder: 0 },
};

function renderCard(overrides: Partial<Parameters<typeof DocumentCard>[0]> = {}) {
  const noop = vi.fn();
  const props = {
    document: baseDoc,
    currentCategoryId: "cat-a",
    preview: false,
    searchMatches: true,
    targetCategories: { office: [], listing: [], sales: [] },
    onCardClick: noop,
    onEdit: noop,
    onTogglePublish: noop,
    onToggleQuickAccess: noop,
    onMoveTo: noop,
    onOpenInViewer: noop,
    onDelete: noop,
    ...overrides,
  };
  return render(
    <DndContext>
      <SortableContext items={[`doc::${props.currentCategoryId}::${props.document.id}`]}>
        <DocumentCard {...props} />
      </SortableContext>
    </DndContext>,
  );
}

describe("DocumentCard", () => {
  it("renders document name and ellipsis trigger", () => {
    renderCard();
    expect(screen.getByText("Purchase Agreement")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Actions for Purchase Agreement" }),
    ).toBeInTheDocument();
  });

  it("shows Draft pill when unpublished", () => {
    renderCard({ document: { ...baseDoc, published: false } });
    expect(screen.getByText("Draft")).toBeInTheDocument();
  });

  it("hides Draft pill in preview mode", () => {
    renderCard({
      document: { ...baseDoc, published: false },
      preview: true,
    });
    expect(screen.queryByText("Draft")).not.toBeInTheDocument();
  });

  it("shows Quick pill when quickAccess is true", () => {
    renderCard({ document: { ...baseDoc, quickAccess: true } });
    expect(screen.getByText("Quick")).toBeInTheDocument();
  });

  it("exposes drag handle with an a11y label", () => {
    renderCard();
    expect(
      screen.getByRole("button", {
        name: "Drag to reorder Purchase Agreement",
      }),
    ).toBeInTheDocument();
  });

  it("hides drag handle in preview mode", () => {
    renderCard({ preview: true });
    expect(
      screen.queryByRole("button", {
        name: "Drag to reorder Purchase Agreement",
      }),
    ).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:run -- src/components/admin/documents-organize/document-card.test.tsx`
Expected: PASS.

### Task 6.2 — Component test for `OrganizeToolbar`

**Files:**
- Create: `src/components/admin/documents-organize/organize-toolbar.test.tsx`

- [ ] **Step 1: Create the test**

Create `src/components/admin/documents-organize/organize-toolbar.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrganizeToolbar } from "./organize-toolbar";

function setup(overrides: Partial<Parameters<typeof OrganizeToolbar>[0]> = {}) {
  const onPreviewChange = vi.fn();
  const onSearchChange = vi.fn();
  const onAddDocument = vi.fn();
  render(
    <OrganizeToolbar
      preview={false}
      onPreviewChange={onPreviewChange}
      search=""
      onSearchChange={onSearchChange}
      onAddDocument={onAddDocument}
      {...overrides}
    />,
  );
  return { onPreviewChange, onSearchChange, onAddDocument };
}

describe("OrganizeToolbar", () => {
  it("fires onAddDocument when Add Document is clicked", () => {
    const { onAddDocument } = setup();
    fireEvent.click(screen.getByRole("button", { name: /Add Document/ }));
    expect(onAddDocument).toHaveBeenCalledOnce();
  });

  it("hides Add Document button when preview is on", () => {
    setup({ preview: true });
    expect(
      screen.queryByRole("button", { name: /Add Document/ }),
    ).not.toBeInTheDocument();
  });

  it("fires onSearchChange when typing", () => {
    const { onSearchChange } = setup();
    fireEvent.change(
      screen.getByPlaceholderText("Search by name or slug…"),
      { target: { value: "lease" } },
    );
    expect(onSearchChange).toHaveBeenCalledWith("lease");
  });

  it("disables the search input when preview is on", () => {
    setup({ preview: true });
    expect(screen.getByPlaceholderText("Search by name or slug…")).toBeDisabled();
  });

  it("toggles preview on click", () => {
    const { onPreviewChange } = setup();
    fireEvent.click(screen.getByRole("switch"));
    expect(onPreviewChange).toHaveBeenCalledWith(true);
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npm run test:run -- src/components/admin/documents-organize/organize-toolbar.test.tsx`
Expected: PASS.

### Task 6.3 — Playwright E2E test

**Files:**
- Create: `tests/e2e/admin/documents-organize.spec.ts`

- [ ] **Step 1: Check existing E2E setup**

Run: `ls tests/e2e/` (via bash) to locate helpers. If an admin login fixture exists, use it. If not, adapt the login flow used in other `tests/e2e/*.spec.ts` files.

- [ ] **Step 2: Create the spec**

Create `tests/e2e/admin/documents-organize.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test.describe("/admin/documents — organize view", () => {
  test.beforeEach(async ({ page }) => {
    // Adapt to existing E2E admin login helper. If tests/e2e has a
    // fixture exporting `loginAsAdmin(page)`, call that here; otherwise
    // replicate the flow from other admin specs in this folder.
    await page.goto("/admin/documents");
    await expect(page.getByRole("heading", { name: "Document Library" })).toBeVisible();
  });

  test("admin sees the organize view by default", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Add Document/ })).toBeVisible();
    await expect(page.getByRole("switch")).toBeVisible();
  });

  test("tab switching updates the visible section", async ({ page }) => {
    await page.getByRole("button", { name: /^Listing/ }).click();
    await expect(page.getByRole("button", { name: /^Listing/ })).toHaveClass(
      /bg-white/,
    );
  });

  test("preview mode hides admin chrome", async ({ page }) => {
    await page.getByRole("switch").click();
    await expect(
      page.getByRole("button", { name: /Add Document/ }),
    ).toHaveCount(0);
    await expect(
      page.locator('button[aria-label^="Drag to reorder"]'),
    ).toHaveCount(0);
  });

  test("keyboard drag moves a card (Space + ArrowDown + Space)", async ({
    page,
  }) => {
    const firstHandle = page
      .locator('button[aria-label^="Drag to reorder"]')
      .first();
    await firstHandle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Space");
    await expect(page.getByText("Order saved")).toBeVisible({ timeout: 5000 });
  });
});
```

- [ ] **Step 3: Run the E2E tests**

Run: `npx playwright test tests/e2e/admin/documents-organize.spec.ts`
Expected: PASS. If a test fails because of auth scaffolding, adjust `beforeEach` to mirror other admin specs in `tests/e2e/` and re-run.

### Task 6.4 — Manual Playwright MCP verification (CLAUDE.md Rule 4)

- [ ] **Step 1: Start the dev server (if not already running)**

Run: `npm run dev` (background).
Expected: dev server on `http://localhost:3000`.

- [ ] **Step 2: Open browser via Playwright MCP**

Navigate to `http://localhost:3000/admin/documents`. Log in as admin.

- [ ] **Step 3: Verify drag interactions**

Manual checks:
- Drag a card within a category → verify new position persists after reload.
- Drag a card from Category A to Category B in the same section → verify move.
- Drag a category header within a section → verify persistence.
- Use the ellipsis menu's "Move to…" to move a doc from Office to Listing → switch tab, verify the doc is present.
- Toggle Preview as agent → drag handles gone, drafts gone, `+ Add Document` gone.
- Exit preview → admin chrome returns.

- [ ] **Step 4: Verify the agent sees changes**

Navigate to `http://localhost:3000/dashboard/agent-hub/documents` (as agent or admin). Verify reorders performed in step 3 are reflected.

- [ ] **Step 5: Verify Quick Access still works**

Toggle Quick Access on a doc via the ellipsis menu. Navigate to `http://localhost:3000/dashboard/agent-hub`. Verify the doc shows in the Quick Access section.

- [ ] **Step 6: Verify console is clean**

Check the browser console — zero red errors through a full drag session.

### Phase 6 checkpoint

After roadmap update per CLAUDE.md Rule 7:

```
/git-workflow-planning:checkpoint 6 component tests, e2e spec, and manual verification
```

---

## Final step — open PR and merge

```
/git-workflow-planning:finish
```

Creates the PR to `develop`, asks before merge, cleans up the branch.

---

## Self-review checklist (writing-plans skill requirement)

### Spec coverage

| Spec section | Covered by |
|---|---|
| Archive legacy UI (Rule 1) | Task 5.2 |
| Types (`OrganizeTree`, `AdminCategoryTree`, `AdminDocumentInCategory`) | Task 1.1 |
| Pure reorder functions | Tasks 1.2, 1.3 |
| Client API wrappers | Task 1.4 |
| GET /organize | Tasks 2.1, 2.2 |
| PATCH /categories/reorder | Tasks 2.3, 2.4 |
| PATCH /memberships/reorder | Tasks 2.5, 2.6 |
| PATCH /memberships/move (incl. cross-section via menu) | Tasks 2.7, 2.8 |
| DnD context wrapper + sensors | Task 3.1 |
| Document card + Draft/Quick pills | Task 3.3 |
| Ellipsis menu (Edit / Publish / Quick / Move to… / View / Delete) | Task 3.2 |
| Category header (drag + edit pencil) | Task 3.4 |
| Empty-category placeholder (dashed, accepts drops) | Task 3.5 |
| Category column w/ SortableContext | Task 3.6 |
| Preview-as-agent toggle | Task 4.1 |
| Toolbar (search + preview + Add Document) | Task 4.2 |
| Section board (category SortableContext + New Category ghost) | Task 4.3 |
| Top-level state, optimistic updates, snap-back | Task 4.4 |
| Wire admin page | Task 5.1 |
| Component tests | Tasks 6.1, 6.2 |
| Playwright E2E | Task 6.3 |
| Manual verification (Rule 4) | Task 6.4 |
| Responsive banner | Task 4.4 (inline within `OrganizeView`) |
| Card-click behavior split (organize vs preview) | Task 4.4 (`handleCardClick`) |

No gaps.

### Placeholder scan

No "TBD", "TODO", "implement later", or "similar to Task N" references. Every code step contains complete code.

### Type consistency

- `documentDragId(id, categoryId)` — defined in Task 3.3, re-exported from Task 3.3, imported in Task 3.6.
- `categoryDragId(id)` — defined in Task 3.4, imported in Task 4.3.
- `OrganizeTree`, `AdminCategoryTree`, `AdminDocumentInCategory` — defined in Task 1.1, used consistently everywhere.
- API function names match between wrapper (`api.ts`) and usage in `organize-view.tsx`: `fetchOrganizeTree`, `reorderCategories`, `reorderMemberships`, `moveMembership`.
- Drag handle `aria-label` pattern: `"Drag to reorder {name}"` — consistent across DocumentCard + CategoryHeader + E2E spec selector `[aria-label^="Drag to reorder"]`.

No inconsistencies.
