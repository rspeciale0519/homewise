# Feature: Bulk Drag-to-Categorize on All Document Library Pages

> **Plan-mode note**: Per CLAUDE.md Rule 6, after approval move/rename this file to `C:\Users\rob\Documents\Software\real-estate\homewise\.claude\plans\feature-bulk-drag-on-section-boards.md` so the branch `feature/bulk-drag-on-section-boards` lines up with `/git-workflow-planning:start feature bulk-drag-on-section-boards`.

---

## 1. Context

The bulk drag-to-categorize feature is live on the Uncategorized tab. Admin can multi-select rows, drag onto a section tab, pick a category, and assign. The user has asked to extend the same flow to the **Office / Listing / Sales** tabs — multi-select cards in any section, then drag onto:

- **A different section tab** → category picker dialog opens scoped to that section
- **A category column** (same or different section) → direct assign (no picker, target is unambiguous)
- **The Uncategorized tab** → remove the source-category membership (the one the dragged doc currently lives in on the active tab); doc returns to the Uncategorized triage list

Mobile drag must work on all tabs as well. The "Move N…" button path (currently only on Uncategorized) needs to surface on every section's toolbar so touch users can bypass drag entirely.

Outcome: the admin can curate Office/Listing/Sales content the same way they triage Uncategorized — select once, move many — across any source category and any destination.

---

## 2. UX summary

```
Admin on Office tab
  ↓ Hover a card → checkbox fades in at top-left (sm:opacity-0 group-hover:opacity-100)
  ↓ Click checkbox row 1 → "1 selected" toolbar appears; all card checkboxes stay visible
  ↓ Click checkbox row 3 → "2 selected"
  ↓ Drag any selected card's body
       ↳ DragOverlay: BulkDragPreview centered on cursor, showing primary doc name + "+1 more"
       ↳ Section tabs Listing/Sales get crimson ring; Office tab NOT a drop target (current)
       ↳ Every category column (Office's other cats + Listing/Sales when reachable) is a drop target
  ↓ Drop on Listing tab → CategoryPickerDialog opens scoped to Listing
  ↓ Pick "Listing Agreements" → Assign
       ↳ Optimistic update via computeBulkMoveBetweenCategories
       ↳ Selection cleared
       ↳ If auto-switch ON: setActiveTab("listing")
       ↳ Toast "Moved 2 to Listing Agreements"  [Undo]
       ↳ POST /api/admin/documents/memberships/bulk-move
```

**Within-section drop on category column** (e.g., 2 cards in "Office Documents" dragged onto "Transaction & Compliance"): no picker. Direct optimistic move + API call + toast with Undo.

**Mobile** (no drag handle, all touch): tap checkboxes (always visible on `< sm`), tap "Move N…" button in the toolbar → CategoryPickerDialog opens at section-step.

**Empty source-category after a bulk move**: nothing special. The column stays rendered as the existing "empty category" state (matches Notion / Linear behavior — no auto-redirect, no spinner).

---

## 3. Architecture decisions

### 3.1 Reuse `useUncategorizedSelection` → rename to `useDocumentSelection`

The hook is fully generic over `readonly string[]`. Rename the file to `use-document-selection.ts`, export `useDocumentSelection`, and keep a thin alias `export const useUncategorizedSelection = useDocumentSelection` to keep existing imports stable. **Or** update the 3 callers in one pass (preferred — clean break).

### 3.2 Drag data type: `"section-bulk"`

When a card is selected AND selection.count ≥ 2, the card's `useSortable` data becomes:

```ts
{
  type: "section-bulk",
  documentId: doc.id,                        // primary (the one grabbed)
  fromCategoryId: currentCategoryId,
  documentIds: string[],                     // entire selection in display order
  perItemSources: Record<docId, categoryId>, // each selected doc's current category (selection may span categories)
}
```

When the card is unselected (or selection.count < 2), keep the existing single-doc `{ type: "document", documentId, fromCategoryId }` data — no behavior regression.

### 3.3 Keep `useSortable` (not `useDraggable`) for section cards

`useDraggable` would lose the in-grid reorder behavior for the unselected single-card path. Keeping `useSortable` is fine — `useOrganizeDragEnd` branches on `data.type`, and the bulk-drop logic doesn't depend on the sortable transform. The drop side does the bulk move regardless of what useSortable would have done.

### 3.4 Card body becomes drag activator; drop the dedicated grip handle

Today the card has a hover-reveal grip handle at `left-1 top-1`. With multi-select added, the visual estate is tight. Move the listeners from the grip to the **card root** with a small activation distance on `PointerSensor` (`activationConstraint: { distance: 5 }`) so click-to-open-drawer still works (movement under 5px = click, over 5px = drag). The grip element is removed.

### 3.5 Checkbox placement on cards

A 20×20 Radix Checkbox lives at `absolute left-1.5 top-1.5`:
- `< sm`: always visible (touch — no hover state)
- `≥ sm`: `opacity-0 group-hover:opacity-100`
- When any card is selected (selection.selectedCount > 0): always visible regardless of hover (passed via a `selectionActive` prop to override the hover gate)
- Selected card gets a crimson ring + tinted background (mirror Uncategorized's row treatment)

The card's existing click handler is gated by `e.target` — clicks on the checkbox don't trigger `onCardClick`. Checkbox onClick captures `shiftKey/ctrlKey/metaKey` for range/toggle modifiers (same pattern as `DraggableUncategorizedRow`).

### 3.6 New backend endpoint: `POST /api/admin/documents/memberships/bulk-move`

The existing `/memberships/move` is single-doc. `bulk-assign` only creates memberships (no delete). For section→section bulk we need both: delete-from-source + create-in-target, per-doc. The endpoint also covers **drag-to-Uncategorized** by accepting `toCategoryId: null` (delete source only, no target create — doc becomes uncategorized if that was its only membership).

```ts
// Request
{
  toCategoryId: string | null,  // null = drop to Uncategorized (delete-only)
  moves: Array<{ documentId: string, fromCategoryId: string }>,  // .min(1).max(50), unique documentIds
}

// Response
{
  toCategoryId: string | null,
  moved:   Array<{ documentId: string, sortOrder: number | null }>,  // sortOrder is null when target is null
  skipped: Array<{ documentId: string, reason: "already-member" | "not-in-source" }>,
  failed:  Array<{ documentId: string, error: string }>,
}
```

Per-item transaction (mirrors `bulk-assign/route.ts` pattern):

1. If `toCategoryId` is non-null, validate it exists once at the top → 404 if missing
2. For each move: in a single `prisma.$transaction`:
   - `delete` source membership (or skip with `"not-in-source"`)
   - If `toCategoryId === null`: stop here — doc is now uncategorized for that section
   - Else: `findUnique` target membership; if exists → push to `skipped["already-member"]`; else `create` at tail (count + 1)
3. After all moves: dense reindex each affected source category once. If `toCategoryId` non-null, dense reindex target once.
4. Auth: `requireAdminApi()`. Zod: `min(1).max(50)`. Cap 50 matches existing patterns.

### 3.7 New reorder helper: `computeBulkMoveBetweenCategories`

```ts
interface BulkMoveBetweenCategoriesArgs {
  tree: OrganizeTree;
  moves: Array<{ documentId: string; fromCategoryId: string }>;
  toCategoryId: string | null;  // null = move to Uncategorized
}
export function computeBulkMoveBetweenCategories(
  args: BulkMoveBetweenCategoriesArgs,
): OrganizeTree;
```

For each move: filter doc out of its `fromCategoryId` list, dense-reindex that source. When `toCategoryId` is non-null, append all moved docs (in given order) to that category's tail with dense `sortOrder`. When `toCategoryId` is null, push the moved docs into `tree.uncategorized` (shaped via `inCategoryToUncategorized` shaper). Reuses the section-key walk pattern from `computeCrossCategoryMove`. **Returns the same tree** if `moves` empty or no doc found.

### 3.8 Drop-target gating

Section tabs (`DroppableSectionTab`) accept drops when `dragIntent === "uncategorized-bulk" || dragIntent === "section-bulk"`. Additional rule for `"section-bulk"`: the **current** section tab is **not** a drop target (would no-op anyway). `acceptsDrop` becomes:

```ts
// section tab
acceptsDrop && tab.key !== currentSourceSection
// where currentSourceSection is the active tab when dragIntent === "section-bulk", else undefined
```

**Uncategorized tab as a drop target** is enabled only when `dragIntent === "section-bulk"` (it's not a valid drop for `uncategorized-bulk` since the source IS uncategorized). On drop, the section-drag-end hook routes to `bulkSectionMove.moveToUncategorized(documentIds, perItemSources)` which fires `bulkMoveMemberships` with `toCategoryId: null`.

Category columns (`CategoryColumn`'s `useDroppable`) already accept drops for the existing single-doc move — they'll naturally accept section-bulk too. The drop handler picks up the new `data.type` and routes to bulk logic.

### 3.9 Bulk move from multiple source categories at once

Selection can span categories within a section (e.g., 2 docs from "Office Documents" + 1 from "Transaction & Compliance"). The `perItemSources` map captures each doc's source. On drop, the client builds the `moves[]` array using this map and fires **one** `bulk-move` request. The server does N transactions (one per doc) and one reindex per affected source category — keeps reindex efficient.

### 3.10 Mobile parity: "Move N…" toolbar button on all tabs

Today this button lives in the Uncategorized list header. Generalize it: when `selection.selectedCount > 0` on any tab, render a "Move N…" button in `OrganizeToolbar` (between Bulk upload and the auto-switch toggle). Tapping it opens `CategoryPickerDialog` with no section preset (button-path, two-step picker).

This also covers the desktop "I'd rather click than drag" preference and gives a stable home for the action on touch.

### 3.11 Extend `snapBulkCenterToCursor` modifier

```ts
if (activeType === "uncategorized-bulk" || activeType === "section-bulk") {
  return snapCenterToCursor(args);
}
```

One-line change.

### 3.12 `BulkDragPreview` accepts a shared shape

Introduce a structural interface:

```ts
interface DraggablePreviewDoc {
  id: string;
  name: string;
}
```

`AdminUncategorizedDoc` and `AdminDocumentInCategory` both satisfy this. Update `BulkDragPreviewProps` to accept `DraggablePreviewDoc[]`. The preview shows the primary doc's name + "+N more" + count badge, identical to today.

---

## 4. New & modified files

### NEW (7 files)

| Path | Est. LOC | Purpose |
|---|---|---|
| `src/app/api/admin/documents/memberships/bulk-move/route.ts` | ~170 | POST handler, per-item transactional moves with reindex. |
| `src/app/api/admin/documents/memberships/bulk-move/route.test.ts` | ~200 | Auth, validation, success path, partial failure, P2002 dedup, dense reindex. |
| `src/app/admin/documents/use-section-bulk-move.ts` | ~150 | Orchestrator hook: optimistic `computeBulkMoveBetweenCategories`, calls `bulkMoveMemberships`, toastWithUndo (undo = inverse bulk-move), auto-switch. |
| `src/app/admin/documents/use-section-bulk-move.test.ts` | ~220 | Happy path, partial, full failure, undo, auto-switch on/off. |
| `src/components/admin/documents-organize/use-section-drag-end.ts` | ~110 | Detects `"section-bulk"` active type, branches by drop target (tab vs category column), forwards to picker (cross-section) or direct bulk-move (column). |

### MODIFIED (~9 files)

| Path | Notes |
|---|---|
| `src/app/admin/documents/use-uncategorized-selection.ts` | Rename file → `use-document-selection.ts`, rename hook → `useDocumentSelection` (alias kept). |
| `src/lib/documents-organize/reorder.ts` | Add `computeBulkMoveBetweenCategories`. ~70 LOC delta. |
| `src/lib/documents-organize/reorder.test.ts` | +60 LOC of tests for the new helper (single source, multiple sources, missing target, empty moves). |
| `src/lib/documents-organize/bulk-membership.ts` | Add `bulkMoveMemberships` client fetcher + `BulkMoveResult` types. ~40 LOC. |
| `src/lib/documents-organize/bulk-membership.test.ts` | +30 LOC for the new fetcher. |
| `src/components/admin/documents-organize/document-card.tsx` | Add 20×20 checkbox top-left with hover/select-aware visibility; move listeners from grip handle to card root; remove dedicated grip; selected-row visual treatment; clamp click-vs-drag via PointerSensor distance. ~120 LOC delta (191 → ~280, still under 450). |
| `src/components/admin/documents-organize/document-card.test.tsx` (if exists, else new) | Test selection states, click vs drag, checkbox modifiers. ~80 LOC. |
| `src/components/admin/documents-organize/bulk-drag-preview.tsx` | Switch prop type to structural `DraggablePreviewDoc[]`. ~5 LOC delta. |
| `src/components/admin/documents-organize/drag-overlay.tsx` | Type widen `activeDragUncategorizedDocs` → rename to `activeDragBulkDocs: DraggablePreviewDoc[]`. ~5 LOC delta. |
| `src/components/admin/documents-organize/dnd-context.tsx` | Extend modifier whitelist with `"section-bulk"`. 1-line. |
| `src/components/admin/documents-organize/use-organize-drag-end.ts` | New branch at the top: if `active.data.type === "section-bulk"`, delegate to `use-section-drag-end`. Keep existing branches untouched. ~25 LOC. |
| `src/components/admin/documents-organize/section-tabs.tsx` + `droppable-section-tab.tsx` | Pass `currentSourceSection` through; exclude active tab from drop targets when `dragIntent === "section-bulk"`. ~10 LOC. |
| `src/components/admin/documents-organize/organize-toolbar.tsx` | Add `selectedCount` + `onMoveSelected` props; render "Move N…" button when `selectedCount > 0`. Hidden in preview. ~25 LOC delta. |
| `src/components/admin/documents-organize/organize-toolbar.test.tsx` | Add tests for Move N… button visibility + click. ~30 LOC. |
| `src/app/admin/documents/uncategorized-list.tsx` | Drop the inline "Move N…" button — moves to OrganizeToolbar (shared). Keep header status text + Clear button. ~20 LOC delta. |
| `src/app/admin/documents/organize-view.tsx` | Hoist `selection` so it covers ALL tabs (active tab's docs feed the hook); wire `use-section-bulk-move` next to `use-uncategorized-bulk-categorize`; thread `dragIntent` updates so both bulk types coexist. ~60 LOC delta. **Already 415 LOC — plan to extract `use-organize-dnd-state.ts` (drag intent + active drag state + dispatcher) so organize-view stays under 450.** |

### LOC budget guard

After extraction in Phase 3, `organize-view.tsx` ends at ~440 LOC. `document-card.tsx` at ~280 LOC. Both under 450.

---

## 5. Phased build sequence

Each phase ends with `/git-workflow-planning:checkpoint`. Branch: `feature/bulk-drag-on-section-boards`.

### Phase 1 — Backend `bulk-move` endpoint + client fetcher + tests

- New route `src/app/api/admin/documents/memberships/bulk-move/route.ts` + test
- Add `bulkMoveMemberships` to `bulk-membership.ts` + test
- Verify with `npm run test:run -- bulk-move`

### Phase 2 — Generalize selection hook + new reorder helper

- Rename `use-uncategorized-selection.ts` → `use-document-selection.ts`; rename hook export; update the 3 callers and the test file
- Add `computeBulkMoveBetweenCategories` to `reorder.ts` + tests

### Phase 3 — Multi-select UI on `DocumentCard` + grip removal + selection plumbing

- Update `document-card.tsx`: top-left checkbox, hover/select-aware visibility, modifier-key handling, card-body drag listeners, remove grip
- Extract `use-organize-dnd-state.ts` from `organize-view.tsx` to free LOC budget
- Hoist `selection` into `organize-view.tsx` keyed by **active-tab doc IDs** (flat across that tab's categories for section tabs; uncategorized list for Uncategorized)
- Wire `selection` down through `SectionBoard` → `CategoryColumn` → `DocumentCard`
- Configure `PointerSensor` activation distance to 5px to disambiguate click vs drag
- Visual smoke: hover a card, see checkbox; click one, see crimson ring; click another (no modifier), it replaces; ctrl-click, both selected

### Phase 4 — Section-bulk drag + drop routing (no picker yet)

- `document-card.tsx`: when card is selected and `selectedCount ≥ 2`, set `useSortable` data to `"section-bulk"` payload
- New hook `use-section-drag-end.ts`: handles section-bulk drop events
- Wire dispatcher in `organize-view.tsx`: route `"uncategorized-bulk"` → existing, `"section-bulk"` → new hook, `"document"`/`"category"` → existing
- Extend droppable section tabs: exclude current tab + Uncategorized
- For now, just `console.log` what was dropped where. No state mutation yet.

### Phase 5 — Cross-section drop (tab target) wires through picker

- New orchestrator hook `use-section-bulk-move.ts`
  - On drop-on-tab: open `CategoryPickerDialog` scoped to the dropped tab's section (reuses existing dialog)
  - On confirm: optimistic `computeBulkMoveBetweenCategories`, call `bulkMoveMemberships`, toast with Undo
- Wire into `organize-view.tsx` via the same picker state slot already used for uncategorized
- Undo: inverse bulk-move (target → original sources, per `perItemSources`)

### Phase 6 — Same/different-section drop (category column target), no picker

- In `use-section-drag-end.ts`, when over.data.type === `"category-drop"` (or sibling card), call `bulkCategorize.assignFromSection(targetCategoryId)` (in-hook helper). No picker.
- Reuse the orchestrator's optimistic+API+undo+autoSwitch path

### Phase 6b — Drag to Uncategorized tab (no picker, no auto-switch since the destination IS visible)

- `DroppableSectionTab` for the Uncategorized tab accepts drops when `dragIntent === "section-bulk"`
- `use-section-drag-end.ts` recognizes `over.data.section === "uncategorized"` and calls `bulkSectionMove.moveToUncategorized({ moves })`
- Orchestrator calls `bulkMoveMemberships({ toCategoryId: null, moves })`
- Optimistic update via `computeBulkMoveBetweenCategories` with `toCategoryId: null`
- Toast: `"Moved N to Uncategorized"  [Undo]` — Undo reverses by calling bulk-move back with original `fromCategoryId`s as target (one bulk-move per original source category, OR a new bulk-assign-with-sources endpoint — using per-category bulk-assign loops is simplest)
- Auto-switch does **not** apply here (no destination section to switch to). Toggle stays where it is.

### Phase 7 — Move N… button in toolbar (mobile + desktop parity)

- `OrganizeToolbar`: render `<button>Move N…</button>` when `selection.selectedCount > 0`
- Remove the duplicated button from `UncategorizedList` header (consolidated)
- Both Uncategorized and section tabs use the same toolbar button now
- Tap target ≥ 44×44 on mobile (h-11 sm:h-9 pattern)

### Phase 8 — Full verify + chrome-devtools E2E

- `npm run verify` (lint + type-check + tests + build)
- chrome-devtools walkthrough:
  - Desktop: select 2 docs in Office, drag onto Listing tab → picker → confirm → tab switches → Undo works
  - Desktop: select 2 docs in Office (different source categories), drag onto a Transaction & Compliance column → direct move (no picker) → toast with Undo
  - Mobile (`resize_page` 390×844): tap checkboxes, tap "Move N…", section step → category step → assign
  - Regression: single-card drag within section still works (no multi-select), category-header reorder still works, Uncategorized→tab drag still works

---

## 6. Backend endpoint details

### `POST /api/admin/documents/memberships/bulk-move`

```ts
const bulkMoveSchema = z.object({
  toCategoryId: z.string().min(1),
  moves: z
    .array(z.object({
      documentId: z.string().min(1),
      fromCategoryId: z.string().min(1),
    }))
    .min(1)
    .max(50)
    .refine(
      (arr) => new Set(arr.map((m) => m.documentId)).size === arr.length,
      { message: "Duplicate documentIds" },
    ),
});
```

Logic per item:
1. Find source membership `(documentId, fromCategoryId)` — if missing → push `{ documentId, reason: "not-in-source" }` to `skipped`
2. Find existing target membership `(documentId, toCategoryId)` — if exists, delete source only, push to `skipped["already-member"]`
3. Else: in transaction, delete source + create target at `tail+i`
4. Catch `P2002` → `skipped["already-member"]`; catch `P2003` → `failed["document-not-found"]`; other → `failed[err.message]`

After loop: collect affected `fromCategoryId` set + target id; dense-reindex each once (one Prisma transaction per category, ordered by `sortOrder asc`).

Response:
```ts
{
  toCategoryId: string,
  moved:   Array<{ documentId: string, sortOrder: number }>,
  skipped: Array<{ documentId: string, reason: "already-member" | "not-in-source" }>,
  failed:  Array<{ documentId: string, error: string }>,
}
```

---

## 7. Reused existing utilities (do not re-invent)

- **Auth + Zod + Prisma + per-item partial-success**: copy from `src/app/api/admin/documents/memberships/bulk-assign/route.ts`
- **Optimistic + snapshot + rollback**: pattern from `use-uncategorized-bulk-categorize.ts`
- **Picker dialog**: `category-picker-dialog.tsx` — no changes needed (already supports both presets)
- **Toast with Undo**: `useToast().toastWithUndo` from `admin-toast.tsx`
- **Persisted auto-switch**: `usePersistedBoolean("homewise.organize.autoSwitchOnAssign", true)` — already wired
- **Snap modifier**: extend type whitelist in `dnd-context.tsx`
- **Selection reducer**: rename `use-uncategorized-selection.ts` → `use-document-selection.ts`, the body is already generic

---

## 8. Verification

End-to-end manual flow (chrome-devtools MCP, both desktop 1440×900 and mobile 390×844):

1. **Section → tab cross-section drag**
   - Office tab → multi-select 3 cards (mix of source categories)
   - Drag a selected card onto Listing tab
   - Picker opens scoped to Listing → pick "Buyer Forms" → Assign
   - All 3 docs land at tail of Buyer Forms; sources cleared; auto-switch to Listing; Undo toast appears
   - Click Undo → docs return to original source categories; "Undone" toast

2. **Section → category column (within section)**
   - Office tab → select 2 cards in "Office Documents"
   - Drag onto "Transaction & Compliance" column
   - No picker; immediate move + toast with Undo

3. **Section → category column (cross-section)**
   - Office tab → select 1 card
   - Drag onto a Listing category column (visible because all section boards render in a single DndContext)
   - Direct move; toast

4. **Section → Uncategorized tab (drag to remove)**
   - Office tab → select 2 cards
   - Drag onto Uncategorized tab → no picker → docs return to Uncategorized list (Office count drops, Uncategorized count rises)
   - Toast: "Moved 2 to Uncategorized" with Undo. Undo restores both docs to their original Office categories.

5. **Mobile button path**
   - Resize to 390×844
   - Office tab → tap 3 checkboxes
   - Tap "Move N…" in toolbar → section step → tap Listing → category step → tap a category → Assign

6. **Regressions to verify still work**
   - Single-card drag within Office (no multi-select) → existing reorder/move
   - Category-header reorder within Office
   - Uncategorized → tab drag (full flow already shipped)
   - Card click (no drag, no checkbox) → opens edit drawer
   - Card menu → all menu actions still fire

7. **Programmatic verification (mid-drag DOM)**: dispatch `pointerdown`/`pointermove` on a card, capture `[data-dndkit-overlay]` rect, confirm overlay center === cursor. Mirror the script used in the snap-center verification.

8. **Unit tests**: `npm run verify` clean (lint + type-check + all tests including new `bulk-move/route.test.ts`, `use-section-bulk-move.test.ts`, `reorder.test.ts` additions).

---

## 9. Out of scope

- **Lasso/marquee select**: click-drag empty space to select a region of cards. Standard Figma-style gesture; out of scope for this iteration.
- **Cross-tab persistence**: if the admin switches tabs mid-multi-select, selection clears (already the pattern). Persisting selection across tabs is a bigger UX question — skip.
- **Drag to reorder within the multi-select destination**: the dropped docs land at the tail of the target category. Admin can drag individuals after to fine-tune position. Multi-doc destination positioning is out of scope.
