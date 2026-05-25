# Feature: Bulk Drag-to-Categorize from Uncategorized → Section Tab

> **Plan-mode note**: This file was written to the global plans dir because plan mode locked the path. Per CLAUDE.md Rule 6, **after plan approval move/rename this to** `C:\Users\rob\Documents\Software\real-estate\homewise\.claude\plans\feature-bulk-drag-categorize.md` so the branch (`feature/bulk-drag-categorize`) lines up with `/git-workflow-planning:start feature bulk-drag-categorize`.

---

## 1. Context

`/admin/documents` currently has four tabs (Office / Listing / Sales / Uncategorized). Drag-and-drop reordering and cross-category moves already work **within** the three section boards via `@dnd-kit`, but the **Uncategorized** tab is a flat non-DnD list — admins triage docs out one-at-a-time via the "Categorize" button on each row, which opens the document drawer and forces a category pick per doc.

For bulk triage (post bulk-upload of e.g. 20+ disclosures), this is slow. This feature lets the admin:

1. **Multi-select** uncategorized docs (checkbox + shift-click range + ctrl/cmd-click toggle + select-all w/ indeterminate).
2. **Drag** the selection onto a section tab (Office / Listing / Sales).
3. **Pick** a destination category from a popover dialog listing that section's categories.
4. **Confirm** → optimistic UI update → API call → success toast with **Undo** (5s).
5. Optional **auto-switch** to the destination tab (default on; persisted toggle).

Outcome: triaging 20 docs goes from ~20 drawer round-trips (~3 clicks each) to one drag + one click. Same data model — no schema change.

---

## 2. UX flow (happy path)

```
Uncategorized tab
  ↓ Admin: checkbox row #2
  ↓ Admin: shift-checkbox row #6  →  rows 2-6 selected (5 docs)
  ↓ Admin: drags row #4 (any selected row) onto "Listing" tab
       ↳ DragOverlay shows stacked-card preview with "+4" badge
       ↳ Listing tab gets crimson ring + scale-up (isOver droppable)
  ↓ Admin: releases → CategoryPickerDialog opens
       Title: "Move 5 documents to Listing"
       Body: scrollable list of Listing categories (radio-style)
       Last-used (sessionStorage) is pre-selected if still valid;
         otherwise NOTHING pre-selected (Confirm disabled)
  ↓ Admin: clicks a category → clicks "Assign 5"
       ↳ Optimistic tree update (docs leave Uncategorized,
         appear at end of target category)
       ↳ Selection cleared
       ↳ If auto-switch ON: setActiveTab("listing")
       ↳ Toast: "Assigned 5 to {Category}"  [Undo]  (5s)
       ↳ POST /api/admin/documents/memberships/bulk-assign
  ↓ (Optional) Admin: clicks Undo within 5s
       ↳ POST /api/admin/documents/memberships/bulk-unassign
       ↳ Docs return to Uncategorized; admin stays on destination tab
       ↳ Toast: "Undone"
```

Error / partial-success: toast says "Assigned 3 of 5 — 2 docs unavailable" (red); silent refetch reconciles.

---

## 3. Architecture decisions

### 3.1 DnD context boundary — **lift one `DndContextProvider` to wrap the entire body**

Today `DndContextProvider` is mounted only on section-board tabs (`organize-view.tsx:387-411`). `@dnd-kit` does not propagate drag events across separate `DndContext` instances — drags must originate and resolve inside one context. We lift one provider to wrap the whole body so both Uncategorized rows (sources) and section tabs (drop targets) live in one drag world.

To prevent section tabs from being accidentally droppable during in-section card drags, track `dragIntent` (`null | "in-section" | "uncategorized-bulk" | "category-reorder"`) in a `useRef` (set synchronously inside `onDragStart`, cleared in `onDragEnd`/`onDragCancel`). Each section tab uses `useDroppable({ disabled: dragIntent !== "uncategorized-bulk" })` so it only accepts drops during bulk drags from Uncategorized.

The existing `useOrganizeDragEnd` already early-returns when `activeTab === "uncategorized"` (line 49) — it stays untouched. A **new sibling hook** `useUncategorizedDragEnd` handles only the new flow. A parent dispatcher in `OrganizeView` picks one based on `active.data.current.type`.

### 3.2 Multi-select state — `useReducer` hook, owned in `OrganizeView`, passed down

Selection is read by drag-start (in/above `OrganizeView`) AND by row visuals (`UncategorizedList`). One source of truth via a hook called in `OrganizeView`, result passed down as a single `selection` prop. Reducer over `useState` because shift-range needs `orderedIds` at action time and several actions are read-then-compute.

```ts
type SelectionState = { ids: Set<string>; anchorId: string | null };
type SelectionAction =
  | { type: "toggle"; id: string; shift: boolean; ctrl: boolean; orderedIds: string[] }
  | { type: "selectAllVisible"; ids: string[] }
  | { type: "clear" }
  | { type: "prune"; existing: string[] };
```

Pruning runs in a `useEffect` when `uncategorizedDocs` changes (covers refetch-removed docs).

**Click semantics on the checkbox** (not the row body — row body still does nothing, preserving today's UX):
- Plain checkbox click → toggle that single id; set anchor.
- Ctrl/Cmd + click → same as plain (toggle, set anchor).
- Shift + click → extend range from anchor to clicked id (inclusive); anchor unchanged.
- Header checkbox → toggle "select all visible" / "clear" (indeterminate when partial).

**ARIA**: list is `role="listbox" aria-multiselectable="true"`; each row is `role="option" aria-selected={isSelected}`.

### 3.3 Drag behavior — Finder/Gmail semantics

- Drag an **unselected** row → drag just that row. Selection unchanged.
- Drag a **selected** row → drag the entire selection (preserving display order).

Decided at `onDragStart` by reading `selection.ids.has(active.id)`.

### 3.4 Bulk-assign API — per-item, partial-success, append at tail

`POST /api/admin/documents/memberships/bulk-assign`
- Zod: `{ categoryId: string.min(1), documentIds: string[].min(1).max(50).unique }`.
- Auth: `requireAdminApi()`.
- Category-exists guard up front → 404 if missing.
- Per-item loop in its own short transaction: `findUnique(documentId_categoryId)` → if exists, push to `skipped[]`; else `create({ sortOrder: maxSortOrder + 1 })` and increment local max.
- Catch `P2002` (unique race) → `skipped[]`. Catch `P2003` (FK missing) → `failed[]` with `"document-not-found"`. Catch any other → `failed[]`.
- **No reindex on assign** — tail-append keeps dense `sortOrder`. (`move` endpoint reindexes because it splices into the middle; we only append.)
- Response: `{ categoryId, assigned: { documentId, sortOrder }[], skipped: { documentId, reason }[], failed: { documentId, error }[] }`.

Mirrors `bulk-create/route.ts` for the partial-success pattern and `memberships/move/route.ts` for the auth + Zod scaffolding. Cap of 50 matches `bulk-create` and is more than enough for one drag batch (uncategorized rarely exceeds this; multiple drags work fine).

### 3.5 Bulk-unassign API — partial-success, dense reindex once

`POST /api/admin/documents/memberships/bulk-unassign` (powers Undo and is general-purpose).
- Zod: same shape as bulk-assign.
- One `deleteMany({ where: { categoryId, documentId: { in: ids } } })` inside a single transaction.
- After delete, do one dense reindex of the target category's remaining memberships (matches the invariant from `memberships/move`).
- Response: `{ categoryId, removed: string[], failed: { documentId, error }[] }` — ids not actually in the category come back in `failed[]` with `"NOT_MEMBER"`.

### 3.6 Optimistic update + rollback

New helper `computeBulkAssignFromUncategorized(tree, documentIds, toCategoryId, uncategorizedDocs)` in `src/lib/documents-organize/reorder.ts`:
1. Filter `documentIds` out of `tree.uncategorized`.
2. Find target section + category.
3. Map each removed `AdminUncategorizedDoc` → `AdminDocumentInCategory` (shaper synthesizes `quickAccess: false`, `membership: { categoryId, sortOrder: cat.documents.length + i }`).
4. Append to target category; return new tree.

Snapshot before optimistic apply; restore on **full** failure; **refetch** on partial success (server is source of truth for which ids actually moved). The Undo handler uses the same snapshot-then-refetch pattern in reverse.

### 3.7 Last-used category persistence

Single sessionStorage key `homewise.organize.lastCategory` holding `{ office?: string; listing?: string; sales?: string }`. Read on dialog open (validate id still exists in the section's categories — invalidate silently if not). Write on confirm. SSR-safe with `typeof window !== "undefined"` guard, matching the pattern in `src/lib/documents/flag-defaults.ts`.

### 3.8 Auto-switch toggle

localStorage key `homewise.organize.autoSwitchOnAssign` (boolean, **default `true`**). Toolbar component matching `PreviewToggle` style. Always visible (per user preference). When ON, `setActiveTab(section)` runs **after** the optimistic tree update, **before** the toast. On Undo: do NOT auto-switch back — toast confirms ("Undone").

### 3.9 Toast with Undo

Sonner natively supports `{ action: { label, onClick }, duration }`. Extend `useToast`:

```ts
toastWithUndo(opts: {
  message: string;
  undoLabel?: string;  // default "Undo"
  durationMs?: number; // default 5000
  onUndo: () => void;
}): void;
```

Multiple in-flight toasts stack naturally; each carries its own closure.

---

## 4. New & modified files

### NEW (12 files)

| Path | Est. LOC | Purpose |
|---|---|---|
| `src/app/api/admin/documents/memberships/bulk-assign/route.ts` | ~150 | POST handler, per-item w/ partial success. |
| `src/app/api/admin/documents/memberships/bulk-assign/route.test.ts` | ~180 | Unit tests (auth, validation, success, P2002, P2003, max sortOrder). |
| `src/app/api/admin/documents/memberships/bulk-unassign/route.ts` | ~110 | POST handler for Undo / general unassign. |
| `src/app/api/admin/documents/memberships/bulk-unassign/route.test.ts` | ~120 | Unit tests (deleteMany scoping, dense reindex, NOT_MEMBER). |
| `src/lib/documents-organize/bulk-membership.ts` | ~80 | Client fetchers + result types. Mirrors `api.ts`. |
| `src/lib/documents-organize/bulk-membership.test.ts` | ~60 | Fetcher tests with mocked `adminFetch`. |
| `src/app/admin/documents/use-uncategorized-selection.ts` | ~110 | `useReducer` hook (toggle/range/selectAll/clear/prune). |
| `src/app/admin/documents/use-uncategorized-selection.test.ts` | ~150 | Reducer behavior tests. |
| `src/app/admin/documents/use-uncategorized-bulk-categorize.ts` | ~170 | Orchestrator hook: picker state, optimistic, undo, auto-switch. |
| `src/app/admin/documents/use-uncategorized-bulk-categorize.test.ts` | ~210 | Hook tests (happy path, partial, full failure, undo). |
| `src/app/admin/documents/category-picker-dialog.tsx` | ~180 | Radix AlertDialog matching bulk-upload style. |
| `src/app/admin/documents/category-picker-dialog.test.tsx` | ~120 | Dialog tests (pre-select, persistence, empty state, cancel). |
| `src/components/admin/documents-organize/droppable-section-tab.tsx` | ~80 | Wraps a tab button with `useDroppable` + visual feedback. |
| `src/components/admin/documents-organize/draggable-uncategorized-row.tsx` | ~110 | Wraps a row with `useDraggable` + drag handle icon. |
| `src/components/admin/documents-organize/bulk-drag-preview.tsx` | ~90 | Stacked-card overlay for N≥1 docs. |
| `src/components/admin/documents-organize/use-uncategorized-drag-end.ts` | ~80 | Drag-end handler for `uncategorized-bulk` → `section-tab-drop`. |
| `src/components/admin/documents-organize/auto-switch-toggle.tsx` | ~55 | Toolbar toggle (style mirrors `preview-toggle.tsx`). |
| `src/hooks/use-persisted-boolean.ts` | ~55 | SSR-safe localStorage-backed boolean. |
| `src/hooks/use-persisted-boolean.test.ts` | ~70 | Hook tests (default, hydration, persistence, quota error). |
| `src/components/ui/checkbox.tsx` | ~30 | shadcn install (`npx shadcn@latest add checkbox`). |

### MODIFIED (8 files)

| Path | Before | After | Notes |
|---|---|---|---|
| `src/app/admin/documents/uncategorized-list.tsx` | 55 | ~150 | Add header row + per-row checkbox + ARIA listbox; render each row via `<DraggableUncategorizedRow>`. |
| `src/components/admin/documents-organize/section-tabs.tsx` | 48 | ~70 | Swap inner `<button>` for `<DroppableSectionTab>`. Accepts new `dragIntent` prop to gate droppable. |
| `src/components/admin/documents-organize/drag-overlay.tsx` | 26 | ~50 | Add 3rd case: render `<BulkDragPreview>` when `activeDragUncats.length > 0`. |
| `src/components/admin/documents-organize/organize-toolbar.tsx` | 73 | ~100 | Add `<AutoSwitchToggle>` between `PreviewToggle` and Bulk Upload. |
| `src/app/admin/documents/organize-dialogs.tsx` | 122 | ~165 | Mount `<CategoryPickerDialog>`; passthrough props only. |
| `src/components/admin/admin-toast.tsx` | 42 | ~75 | Add `toastWithUndo`. |
| `src/app/admin/documents/organize-view.tsx` | **438** | **~440** | Lift DndContext; wire selection hook + bulk-categorize hook + auto-switch; dispatch drag-end. Net delta managed by extracting one hook (see Phase 3). |
| `src/lib/documents-organize/reorder.ts` | 102 | ~145 | Add `computeBulkAssignFromUncategorized` + `computeBulkUnassign` (the inverse). |
| `src/lib/documents-organize/reorder.test.ts` | existing | +~80 | Test the two new helpers. |
| `src/lib/documents-organize/shapers.ts` | existing | +~25 | Add `uncategorizedToInCategory(doc, categoryId, sortOrder)`. |

### LOC-budget guard for `organize-view.tsx`

Without extraction, after Phase 3+5 changes the file would hit ~480. The cleanest extraction is `use-doc-actions.ts` (~135 LOC, pulls `handleTogglePublish`, `handleToggleQuickAccess`, `handleOpenInViewer`, `handleCardClick`, `handleEditDoc`, `handleMoveViaMenu`, `confirmDelete`). Done in Phase 3, this trims `organize-view.tsx` to ~315 LOC pre-Phase 4, leaving ample headroom. Final estimate ~440 LOC.

---

## 5. Phased build sequence

Each phase ends with `/git-workflow-planning:checkpoint`. The branch name is `feature/bulk-drag-categorize` (Rule 9 / file name).

### Phase 1 — Backend bulk-assign + bulk-unassign + client fetchers + tests

**Files created**: `bulk-assign/route.ts` + `.test.ts`, `bulk-unassign/route.ts` + `.test.ts`, `bulk-membership.ts` + `.test.ts`.

**Files modified**: none.

**Verification**:
- `npm run type-check && npm run lint && npm run test:run -- memberships`
- Smoke test via `curl` with an admin cookie to confirm 401/403 gates work.

**Checkpoint message**: `/git-workflow-planning:checkpoint 1 bulk-assign and bulk-unassign endpoints`

### Phase 2 — Selection hook + checkbox UI + shadcn install

**Files created**: `use-uncategorized-selection.ts` + test, `components/ui/checkbox.tsx` (via CLI).

**Files modified**: `uncategorized-list.tsx` (header row + checkboxes + ARIA + new `selection` prop), `organize-view.tsx` (instantiate selection hook, pass down).

**Verification**:
- `npm run type-check && npm run lint && npm run test:run -- selection uncategorized-list`
- Manual: tab to Uncategorized, click row-1 checkbox, shift-click row-5 checkbox → rows 1-5 highlighted; header checkbox indeterminate → click → all selected.

**Checkpoint message**: `/git-workflow-planning:checkpoint 2 multi-select on uncategorized list`

### Phase 3 — Lift DndContext + droppable tabs + draggable rows + multi-overlay + extraction

**Files created**: `droppable-section-tab.tsx`, `draggable-uncategorized-row.tsx`, `bulk-drag-preview.tsx`, `use-uncategorized-drag-end.ts`, `use-doc-actions.ts` (extraction).

**Files modified**:
- `section-tabs.tsx` — swap inner button for `<DroppableSectionTab>`; accept `dragIntent`.
- `uncategorized-list.tsx` — render each row via `<DraggableUncategorizedRow>`.
- `drag-overlay.tsx` — add 3rd case for `<BulkDragPreview>`.
- `organize-view.tsx` — lift `<DndContextProvider>` to wrap entire body; add `dragIntentRef` + dispatcher in `handleDragStart`/`handleDragEnd`; add `pendingBulkAssign` state; **extract `useDocActions`** to free LOC.

**No dialog yet** — on drop, `console.log("would open picker")` placeholder.

**Verification**:
- `npm run type-check && npm run lint && npm run test:run`
- Manual: select 3 docs, drag onto Listing tab → drag preview shows stacked cards w/ "+2"; tab gets crimson ring on hover; console logs the captured payload on release; **regression** — drag within Office board still reorders correctly.

**Checkpoint message**: `/git-workflow-planning:checkpoint 3 lift DndContext and wire uncategorized drag`

### Phase 4 — Category picker dialog + optimistic update

**Files created**: `category-picker-dialog.tsx` + test, `use-uncategorized-bulk-categorize.ts` + test.

**Files modified**:
- `reorder.ts` — add `computeBulkAssignFromUncategorized` + `computeBulkUnassign`.
- `reorder.test.ts` — coverage for the two new helpers.
- `shapers.ts` — add `uncategorizedToInCategory`.
- `organize-dialogs.tsx` — mount the picker; thread props.
- `organize-view.tsx` — consume `pendingBulkAssign`; wire `useUncategorizedBulkCategorize`; render picker via OrganizeDialogs.

**Toast is still plain** (no Undo yet — Phase 5 swaps it). **No auto-switch wiring yet** — TODO in the orchestrator.

**Verification**:
- `npm run type-check && npm run lint && npm run test:run`
- Manual happy path: select 3 → drag to Listing → pick a category → docs leave Uncategorized, appear at end of target category → success toast. Pre-select: open picker twice; on second open the same category should be pre-selected. Open picker for a section with no categories → empty-state copy renders. Cancel → no API call, selection retained.

**Checkpoint message**: `/git-workflow-planning:checkpoint 4 category picker dialog and optimistic move`

### Phase 5 — Toast with Undo + auto-switch toggle (persisted)

**Files created**: `use-persisted-boolean.ts` + test, `auto-switch-toggle.tsx`.

**Files modified**:
- `admin-toast.tsx` — add `toastWithUndo`.
- `use-uncategorized-bulk-categorize.ts` — replace plain toast with `toastWithUndo`; add `undoAssign` (calls `bulkUnassignMemberships`); wire `autoSwitch` arg (`setActiveTab(section)` after optimistic apply if true).
- `use-uncategorized-bulk-categorize.test.ts` — add undo tests (happy, failure-rollback) + auto-switch on/off branches.
- `organize-toolbar.tsx` — add `<AutoSwitchToggle>`.
- `organize-view.tsx` — instantiate `usePersistedBoolean("homewise.organize.autoSwitchOnAssign", true)`; pass through.

**Verification**:
- `npm run type-check && npm run lint && npm run test:run`
- Manual end-to-end:
  1. Open `/admin/documents` → Uncategorized.
  2. Select 4 docs (click + shift-click).
  3. Drag onto Listing tab → pick a category → confirm.
  4. Verify: tab auto-switches to Listing, docs appear at end of target category, toast "Assigned 4 to {Category}" with Undo.
  5. Click Undo within 5s → docs return to Uncategorized; admin stays on Listing tab; "Undone" toast.
  6. Toggle auto-switch OFF, repeat → verify tab does NOT switch.
  7. Reload page → toggle state persisted.
  8. Open picker again → previously chosen category pre-selected.
- **Regressions to verify**: in-section reorder still works; cross-category drag in section boards still works; bulk upload still lands in Uncategorized; per-row "Categorize" button still opens the document drawer.

**Checkpoint message**: `/git-workflow-planning:checkpoint 5 toast undo and auto-switch toggle`

### Phase 6 — chrome-devtools MCP walkthrough + final verify

**Files created/modified**: none unless verification surfaces issues.

**Verification**:
- `npm run verify` (lint + type-check + test:run + build).
- chrome-devtools MCP walkthrough of the happy path against the running dev server:
  - `mcp__chrome-devtools__new_page` → `http://localhost:3000/admin/documents`
  - `mcp__chrome-devtools__take_snapshot` to confirm DOM
  - Click into Uncategorized; checkbox row 1; shift-click row 3 (note: shift-click via MCP click is awkward — fall back to manual verification for the shift gesture if MCP doesn't support modifier keys)
  - `mcp__chrome-devtools__drag` from a selected row to the Listing tab
  - `mcp__chrome-devtools__take_screenshot` of picker
  - Click a category; click Confirm
  - `mcp__chrome-devtools__take_screenshot` of post-state (docs in target, toast visible)
  - Click Undo; screenshot final state
- `mcp__chrome-devtools__list_console_messages` to confirm no errors.

**Checkpoint message**: handled by `/git-workflow-planning:finish` (PR + merge prompt).

---

## 6. Type signatures + Zod schemas

### Bulk-assign request / response

```ts
// src/app/api/admin/documents/memberships/bulk-assign/route.ts
const bulkAssignSchema = z.object({
  categoryId: z.string().min(1),
  documentIds: z
    .array(z.string().min(1))
    .min(1)
    .max(50)
    .refine((arr) => new Set(arr).size === arr.length, {
      message: "Duplicate documentIds",
    }),
});

// Response (200)
interface BulkAssignResponse {
  categoryId: string;
  assigned: Array<{ documentId: string; sortOrder: number }>;
  skipped: Array<{ documentId: string; reason: "already-member" }>;
  failed: Array<{ documentId: string; error: string }>;
}
```

### Bulk-unassign request / response

```ts
// Same schema shape as bulk-assign
interface BulkUnassignResponse {
  categoryId: string;
  removed: string[];
  failed: Array<{ documentId: string; error: string }>;
}
```

### Selection hook contract

```ts
// src/app/admin/documents/use-uncategorized-selection.ts
export interface UseUncategorizedSelectionResult {
  selectedIds: ReadonlySet<string>;
  isSelected: (id: string) => boolean;
  isAllSelected: boolean;
  isIndeterminate: boolean;
  selectedCount: number;
  toggleOne: (
    id: string,
    modifiers: { shiftKey?: boolean; ctrlKey?: boolean; metaKey?: boolean },
  ) => void;
  toggleAll: () => void;
  clear: () => void;
}
export function useUncategorizedSelection(
  orderedDocIds: string[],
): UseUncategorizedSelectionResult;
```

### Bulk-categorize orchestrator hook

```ts
// src/app/admin/documents/use-uncategorized-bulk-categorize.ts
interface BulkCategorizeArgs {
  tree: OrganizeTree | null;
  setTree: (next: OrganizeTree) => void;
  uncategorizedDocs: AdminUncategorizedDoc[];
  setActiveTab: (tab: OrganizeTab) => void;
  clearSelection: () => void;
  refetch: () => Promise<void>;
  toast: ReturnType<typeof useToast>;
  autoSwitch: boolean;
}
interface BulkCategorizeResult {
  assignFromUncategorized: (args: {
    section: DocumentSection;
    categoryId: string;
    categoryTitle: string;
    documentIds: string[];
  }) => Promise<void>;
}
export function useUncategorizedBulkCategorize(
  args: BulkCategorizeArgs,
): BulkCategorizeResult;
```

### CategoryPickerDialog props

```ts
export interface CategoryPickerDialogProps {
  open: boolean;
  onCancel: () => void;
  section: DocumentSection;
  categories: AdminCategoryTree[];      // already filtered to section
  documentCount: number;                // for title copy
  onConfirm: (args: { categoryId: string; categoryTitle: string }) => void;
}
```

### Drag-event ID + data conventions (new)

```ts
// uncategorized row draggable
useDraggable({
  id: `uncat::${doc.id}`,
  data: { type: "uncategorized-bulk", documentIds: string[] }, // resolved at drag-start
});

// section tab droppable
useDroppable({
  id: `tab::${section}`,
  data: { type: "section-tab-drop", section: DocumentSection },
  disabled: dragIntent !== "uncategorized-bulk",
});
```

---

## 7. Reused existing utilities (do not re-invent)

- **Auth**: `requireAdminApi()` + `isError()` from `src/lib/admin-api.ts` (used by both new routes).
- **Client fetch**: `adminFetch<T>()` from `src/lib/admin-fetch.ts` (used by `bulk-membership.ts`).
- **Optimistic-update + snapshot pattern**: copy the shape from `use-organize-drag-end.ts:155-175`.
- **AlertDialog idiom + sizing**: mirror `bulk-upload-dialog.tsx` (Radix AlertDialog.Root/Portal/Overlay/Content/Title/Description/Cancel/Action).
- **Toggle style**: mirror `preview-toggle.tsx` for the new `AutoSwitchToggle`.
- **SSR-safe localStorage**: `flag-defaults.ts:7-26` pattern for the new `usePersistedBoolean`.
- **Shaper for in-category docs**: extend `src/lib/documents-organize/shapers.ts` with `uncategorizedToInCategory`.
- **Drag preview card visuals**: reference `DragPreviewCard` styling for `BulkDragPreview` (duplicate ~30 LOC of card markup is cheaper than synthesizing an `AdminDocumentInCategory` shape from an `AdminUncategorizedDoc` just to feed it back).

---

## 8. Final verification (end of Phase 6)

Run, in order:
1. `npm run type-check`
2. `npm run lint`
3. `npm run test:run`
4. `npm run build`
5. Start dev server (or reuse existing); chrome-devtools MCP walkthrough (Phase 6).
6. Visual regression scan on `/admin/documents` (other tabs render correctly; toolbar layout intact; no console errors).
7. Push branch; `/git-workflow-planning:finish` opens PR → develop, then ask before promoting to main per the bulk-upload release pattern.

---

## 9. Mobile / touch support

The page already shows a "drag works best on desktop" hint. To make this feature actually usable on phones/tablets — not just degrade gracefully — we add a **second path** to the same backend.

### 9.1 Two paths to the same result

| Path | Best on | How it works |
|---|---|---|
| **Drag-to-tab** (desktop) | Mouse | Multi-select via shift/ctrl-click; drag a selected row onto Office/Listing/Sales; picker opens scoped to that section. |
| **"Move N selected…" button** (works everywhere, recommended on mobile) | Touch + mouse | Tap checkboxes to select; tap a button in a sticky action bar; picker opens with a **section step** first, then category. |

Both paths hit the same `bulkAssignMemberships` API, run the same optimistic update, fire the same toast with Undo, and respect the same auto-switch toggle.

### 9.2 New file (mobile path)

| Path | Est. LOC | Purpose |
|---|---|---|
| `src/components/admin/documents-organize/selection-action-bar.tsx` | ~80 | Sticky bottom bar (mobile) / inline pill (desktop) that appears when `selectedCount > 0`. Shows "N selected · Move…  · Clear". Replaces the empty-state when selection exists. |

### 9.3 Modified for mobile

- **`category-picker-dialog.tsx`** — accept an optional `section` prop. When omitted (button path), render a section selector first (3 chips: Office / Listing / Sales), then the category list updates to that section. When provided (drag path), skip the section step (current behavior). Adds ~40 LOC → ~220 total.
- **`uncategorized-list.tsx`** — render `<SelectionActionBar>` when `selection.selectedCount > 0`. On mobile (Tailwind `sm:` breakpoint), it's a `fixed bottom-4 left-4 right-4` action bar with `z-40`; on desktop (`sm:` and up), it's an inline pill above the list. Tap targets ≥ 44×44px.
- **`draggable-uncategorized-row.tsx`** — checkbox tap target ≥ 44×44px via padded wrapper (`p-2` around an `h-4 w-4` checkbox = effective 32px; bump to `p-3` and `h-5 w-5` for ≥ 44px on touch).
- **`organize-toolbar.tsx`** — auto-switch toggle visibility: hide its **label** on `< sm`, keep the toggle icon (toolbar is cramped on mobile).
- **`section-tabs.tsx`** — droppable tabs work on touch via the existing `TouchSensor` (already `delay: 180, tolerance: 6` in `dnd-context.tsx`). No code change, but mark explicitly: on mobile the recommended path is the action bar, drag is supported but secondary.

### 9.4 Picker dialog two-step shape (mobile path)

When `section` prop is **omitted**:

```
┌─────────────────────────────────────┐
│ Move 5 documents                    │
│                                     │
│ Step 1 of 2: Pick a section         │
│ [ Office ]  [ Listing ]  [ Sales ]  │  ← tap one to advance
│                                     │
│                            [Cancel] │
└─────────────────────────────────────┘
         ↓ (tap Listing)
┌─────────────────────────────────────┐
│ Move 5 documents to Listing  [Back] │
│                                     │
│ Step 2 of 2: Pick a category        │
│ ○ Buyer Forms                       │
│ ○ Disclosures                       │
│ ● Inspections                       │
│ ○ ...                               │
│                                     │
│                    [Cancel] [Assign]│
└─────────────────────────────────────┘
```

When `section` prop is **provided** (drag path), skip directly to Step 2 — current behavior. The same dialog component handles both via an internal `currentStep` state.

### 9.5 Mobile-specific verification (Phase 6)

- chrome-devtools MCP: `mcp__chrome-devtools__resize_page` to 390×844 (iPhone 14 viewport). Re-run the walkthrough through the button path: tap 3 checkboxes → tap "Move 3…" → tap Listing → tap a category → tap Assign. Confirm sticky action bar renders, picker is full-width, toast is reachable.
- Verify drag path on touch still works (TouchSensor activation delay 180ms): long-press a row, drag to tab. Slower but functional.
- Confirm tap targets ≥ 44×44px in DevTools accessibility tree.

---

## 10. Out of scope (explicit non-goals)

- Range-select replacement on touch (no shift key on touch; admins tap individual checkboxes or use header "select all").
- Scroll-into-view of the destination category after auto-switch (revisit if asked).
- E2E Playwright tests (codebase doesn't have them; chrome-devtools manual walkthrough is the verification floor — happens to also cover mobile via `resize_page`).
- Server-side audit log of bulk-assign / bulk-unassign (bulk-delete has one; reusing it would require a new schema and is over-scope for this feature).
- Drag-to-reorder within Uncategorized (no meaningful order — server returns `createdAt desc`).
