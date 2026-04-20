# Admin Document Library — Drag-and-Drop Organize View

**Date:** 2026-04-18
**Status:** Approved for planning
**Area:** Admin · Documents
**Related specs:** `2026-04-18-admin-document-delete-design.md`, `2026-04-12-document-library-grid-design.md`

---

## Summary

Replace the current admin document library (tab-based tables at `/admin/documents`) with a single **Organize View** that mirrors the agent-facing Document Library. Admins gain drag-and-drop positioning for documents within categories, categories within sections, and documents across categories within the same section. All existing admin capabilities (add, edit, delete, publish/unpublish toggle, Quick Access toggle, slug editing) are preserved via per-card ellipsis menus and contextual actions. A "Preview as agent" toggle lets admins verify the live agent-facing result without leaving the page.

The goal: **admins see exactly what agents see, so organizing is done in the same visual frame agents use.**

---

## Motivation

The current admin view shows documents and categories as flat tables, grouped under tabs. This is efficient for bulk operations but disconnected from the agent-facing layout — admins cannot easily judge visual flow, category balance, or sibling ordering without navigating between `/admin/documents` and `/dashboard/agent-hub/documents`.

The database already supports ordering (`DocumentCategory.sortOrder`, `DocumentCategoryMembership.sortOrder`) but ordering is editable only via numeric inputs in drawer forms — tedious and error-prone.

A WYSIWYG organize view makes positioning direct, visible, and fast.

---

## Scope

### In scope

- Drag-and-drop reorder of documents within a category.
- Drag-and-drop reorder of categories within a section (Office / Listing / Sales).
- Drag-and-drop move of a document from one category to another **within the same section (tab).**
- "Move to…" menu item on each card for cross-section moves.
- Agent-mirroring visual layout (same tabs, same category grouping, same card grid).
- Admin overlays: drag handles (on hover), persistent ellipsis menu per card, category edit affordance, "+ Add Document" and "+ New Category" buttons.
- "Preview as agent" toggle that hides drafts, hides empty categories, hides admin overlays, and restores agent click-to-viewer behavior.
- Inline search that fades non-matching cards to 30% opacity (preserves drag context).
- Auto-save on drop with snap-back on failure.
- Keyboard accessibility (Space/Arrow/Enter/Escape) and screen-reader live-region announcements.
- Tablet-and-up support; mobile supported but a banner suggests a larger screen for best drag experience.

### Out of scope

- Cross-section drag-and-drop (admin uses "Move to…" menu item or the edit drawer instead).
- Bulk operations (multi-select drag, bulk publish). Admins who need this will use the edit drawer per-doc; a bulk view can be added later if needed.
- Undo for reorder actions (destructive actions like delete retain their existing confirm dialog).
- Reordering of sections themselves (Office / Listing / Sales order is hard-coded).
- Changes to the agent-facing Document Library UI.

---

## Decisions (from brainstorming)

| # | Question | Decision |
|---|---|---|
| 1 | Scope of draggable items | Documents within category + categories within section + docs across categories within section |
| 2 | UI integration | Full replacement of existing admin view with the new Organize view (option A) |
| 3 | Cross-section drag | Not allowed via drag; provided via "Move to…" menu item (option A) |
| 4 | Save semantics | Auto-save on drop with snap-back on failure (option A) |
| 5 | Drafts + empty categories | Visible by default; "Preview as agent" toggle hides them (option C) |
| 6 | Legacy table UI | Archived to `archive/admin/documents/` per Rule 1; not kept as a fallback (option A) |

---

## Architecture

### File layout

```
src/app/admin/documents/
├── page.tsx                          (unchanged header; renders OrganizeView)
├── organize-view.tsx                 (top-level client component; tabs, data fetching, state)
└── types.ts                          (extended with organize-specific types)

src/components/admin/documents-organize/
├── section-board.tsx                 (renders one section: categories + "+ New Category" ghost)
├── category-column.tsx               (category header + card grid; sortable container)
├── category-header.tsx               (title, description, count, drag handle, edit pencil)
├── document-card.tsx                 (agent-style card + admin overlay)
├── document-card-menu.tsx            (ellipsis dropdown: Edit, Publish, Quick Access, Move to…, Delete)
├── empty-category-placeholder.tsx    ("Drop documents here" dashed drop zone)
├── preview-toggle.tsx                (switch in page header)
├── organize-toolbar.tsx              (Add Document button, preview toggle, search input)
└── dnd-context.tsx                   (wraps @dnd-kit DndContext; sensors + drag handlers)

src/lib/documents-organize/
├── reorder.ts                        (pure functions: computeReorder, computeCrossCategoryMove)
└── api.ts                            (client fetchers for reorder / move endpoints)

archive/admin/documents/
└── documents-admin-view.tsx          (moved from src/app/admin/documents/)
```

### Existing components reused (no changes)

- `src/components/admin/document-drawer.tsx` — add/edit document
- `src/components/admin/document-category-drawer.tsx` — add/edit category
- `src/components/admin/confirm-dialog.tsx` — delete confirmation
- `src/components/admin/admin-toast.tsx` — toast system
- `src/lib/admin-fetch.ts` — client fetcher

### Rendering strategy

- `page.tsx` stays a server component (header markup only).
- `OrganizeView` is a client component that fetches the full tree via `adminFetch` on mount.
- No server-side data fetching for the tree — avoids prop-drilling deep structures and simplifies optimistic updates.
- Toasts continue via the existing `useToast` hook.

### DnD library

**`@dnd-kit/core` + `@dnd-kit/sortable`.** Rationale:

- Works with React 19 and concurrent rendering.
- Built-in keyboard accessibility (Space / Arrow / Enter / Escape).
- Pointer, touch, and keyboard sensors out of the box.
- Widely used in production (Notion-style UIs) and actively maintained.
- Bundle ~30 kB gzipped.
- Respects `prefers-reduced-motion` by default.

---

## UI & interaction design

### Page layout

```
┌──────────────────────────────────────────────────────────────┐
│  Document Library                          [+ Add Document]  │
│  Manage documents, categories, and URL slugs agents see.     │
│                                                              │
│  [Office (24)] [Listing (18)] [Sales (12)]   [👁 Preview]    │
│  [🔍 Search documents…                                  ]    │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ⋮⋮  Buyer Forms  (6)                              ✎         │
│  ─────────────────────────────────────────────                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐           │
│  │⋮⋮ 📄 AS-IS ⋮│  │⋮⋮ 📄 Buyer ⋮│  │⋮⋮ 📄 Repr  ⋮│           │
│  │   Contract  │  │   Advisory  │  │   Agreement │           │
│  └─────────────┘  └─────────────┘  └─────────────┘           │
│                                                              │
│  ⋮⋮  Listing Forms  (8)                            ✎         │
│  ─────────────────────────────────────────────                │
│  ┌─────────────┐  ┌─────────────┐                            │
│  │⋮⋮ 📄 Draft ⋮│  │⋮⋮ 📄 MLS   ⋮│                            │
│  │   [Draft]   │  │   Input     │                            │
│  └─────────────┘  └─────────────┘                            │
│                                                              │
│  ┌ - - - - - - - - - - - - - - - - - - - - - ┐              │
│  │  + New Category                            │              │
│  └ - - - - - - - - - - - - - - - - - - - - - ┘              │
└──────────────────────────────────────────────────────────────┘
```

### Document card

Body uses the exact same visual as `DocumentList` on the agent page (same icon, name, description, rounded border, hover treatment). Admin-only overlays:

- **Drag handle** — ⋮⋮ icon, 16 px, top-left, visible on card hover, `cursor-grab` / `cursor-grabbing`. `aria-label="Drag to reorder {doc name}"`.
- **Ellipsis menu** — ⋮ icon, 16 px, top-right, **always visible** (so admins don't have to hover to find it). Opens a dropdown with:
  - Edit…
  - Publish / Unpublish (label reflects current state)
  - Add to Quick Access / Remove from Quick Access
  - Move to… → Office ▸ / Listing ▸ / Sales ▸ → category list
  - View in viewer (opens `/dashboard/documents/viewer?slug=…` in new tab)
  - ─────
  - Delete (red text; opens existing `ConfirmDialog` with type-to-confirm "DELETE")
- **Draft pill** — muted "Draft" badge next to the name when `!published`. Hidden in Preview mode.
- **Quick pill** — amber "Quick" badge (matches current table-view pill) when `quickAccess`. Hidden in Preview mode.

**Card body click behavior:**
- **Organize mode (default):** opens the edit drawer.
- **Preview-as-agent mode:** routes to the viewer for PDF documents, or the external URL / download for non-PDFs (matches agent behavior exactly).

### Category header

- **Drag handle** — ⋮⋮ on hover at the left, scoped to the entire header.
- **Title** + doc count pill (identical to agent-page style).
- **Edit pencil (✎)** — appears on hover at the right. Click opens the existing `DocumentCategoryDrawer` (rename, slug, description, delete). The whole header is **not** click-to-edit — too easy to trigger during drag setup.
- **Drag constraint:** categories cannot be dragged outside their section. Attempting to do so shows a red dashed outline with `not-allowed` cursor; the category snaps back on release.

### Empty category placeholder

- Dashed-border container, 56 px tall, centered text "Drop documents here".
- Accepts drops.
- Clickable to open the Add Document drawer with that category preselected.
- Visible only in organize mode; hidden in Preview-as-agent mode.

### Section end

- "+ New Category" ghost card (dashed border, centered text) at the end of each section in organize mode.
- Clicking opens the `DocumentCategoryDrawer` with `section` preselected.
- Hidden in Preview mode.

### Drop zone visual feedback

- While dragging a card: sibling cards animate aside to reveal insertion point. Target category (if different from origin) gets a subtle blue ring.
- While dragging a category: sibling categories animate aside. Invalid drop zones (other sections, outside section-board) show red outline.
- Drop on origin position: no-op, no API call.
- Invalid drops: card shakes briefly and snaps back.

### Preview-as-agent toggle

Small switch (`👁 Preview as agent`) in the page header next to tabs. When on:

- Drafts hidden (`published: false` docs excluded)
- Empty categories hidden (categories with 0 published docs excluded)
- Drag handles hidden
- Ellipsis menus hidden
- "+ Add Document" button hidden
- "+ New Category" ghost hidden
- Category edit pencils hidden
- Card click routes to viewer (agent behavior)
- Toggle itself remains visible so admin can exit

Toggling off mid-drag cancels the drag and snaps back.

### Search

- Input in the toolbar; filters locally.
- Matching cards stay at full opacity; non-matching fade to 30% opacity and become non-draggable.
- Search applies across all three tabs — count pills reflect matching counts when search is active.
- Clearing search restores all cards.
- Hidden in Preview mode.

### Keyboard accessibility

- Tab cycles through drag handles → ellipsis menus → category edit pencils → tab bar → toolbar.
- **Drag via keyboard:**
  - Focus a card's drag handle → Space picks up.
  - Arrow keys move (Up/Down within grid, Left/Right across columns).
  - Space or Enter drops.
  - Escape cancels, returning to origin.
- `aria-live="polite"` region announces each position change and the final drop ("Moved AS-IS Contract to Listing Forms, position 2 of 5").
- Ellipsis menu opens on Enter or Space; arrow keys navigate items.
- All buttons and handles have descriptive `aria-label`s.

### Responsive behavior

- **≥1024 px:** 3-column card grid per category (matches agent).
- **768–1023 px:** 2-column grid.
- **<768 px:** 1-column grid. Dismissible banner: *"Drag-and-drop works best on larger screens. For easier organization, open this page on a tablet or desktop."* Drag still functional via long-press (400 ms activation).

---

## Data flow & API

### Schema — no changes

The existing tables already support this feature:

- `DocumentCategory.sortOrder` (Int) — category position within its section.
- `DocumentCategoryMembership.sortOrder` (Int) — document position within a category.
- `DocumentCategoryMembership` composite PK `[documentId, categoryId]` — documents can belong to multiple categories (rare; handled).

A document's section is derived from the section of whichever category contains it.

### New API endpoints

All live under `/api/admin/documents/` and require admin auth (same pattern as existing `src/app/api/admin/documents/[id]/route.ts`).

#### 1. `GET /api/admin/documents/organize`

Returns the full tree for the organize view in one round-trip. Includes drafts and empty categories.

```ts
// Response
{
  sections: {
    office:  { categories: AdminCategoryTree[] },
    listing: { categories: AdminCategoryTree[] },
    sales:   { categories: AdminCategoryTree[] }
  }
}

type AdminCategoryTree = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  section: "office" | "listing" | "sales";
  sortOrder: number;
  documents: AdminDocumentInCategory[];   // ordered by membership.sortOrder
};

type AdminDocumentInCategory = {
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
};
```

#### 2. `PATCH /api/admin/documents/categories/reorder`

```ts
// Request
{
  section: "office" | "listing" | "sales",
  categoryIds: string[]   // full ordered list for this section
}

// Response
{ ok: true }
```

**Server behavior:**
- Validate every ID exists and belongs to `section`.
- Validate the list covers every category currently in that section (catches stale client state).
- Update `sortOrder` to `[0, 1, 2, …]` in a single transaction.
- Returns 409 with `{ error, currentOrder }` on validation failure so the client can reconcile.

#### 3. `PATCH /api/admin/documents/memberships/reorder`

```ts
// Request
{
  categoryId: string,
  documentIds: string[]   // full ordered list for this category
}
```

**Server behavior:**
- Validate all docs are current members of `categoryId`.
- Validate list covers every current member.
- Update `DocumentCategoryMembership.sortOrder` to `[0, 1, 2, …]` in a transaction.

#### 4. `PATCH /api/admin/documents/memberships/move`

```ts
// Request
{
  documentId: string,
  fromCategoryId: string,
  toCategoryId: string,
  toIndex: number
}
```

**Server behavior (transaction):**
- Verify `documentId` is currently a member of `fromCategoryId`. 409 if not.
- If `documentId` is already a member of `toCategoryId`:
  - Delete the `fromCategoryId` membership.
  - Update the `toCategoryId` membership's `sortOrder` to `toIndex`.
- Otherwise:
  - Delete the `fromCategoryId` membership.
  - Insert a new membership for `toCategoryId`.
- Re-index `sortOrder` on both affected categories to `[0, 1, 2, …]`.

Cross-section moves (via "Move to…" menu) use this same endpoint — the target category just happens to be in a different section.

### Existing endpoints (unchanged, still used)

| Endpoint | Purpose |
|---|---|
| `POST /api/admin/documents/upload` | Upload new document file |
| `POST /api/admin/documents` | Create document record |
| `PATCH /api/admin/documents/:id` | Edit, publish toggle, quickAccess toggle |
| `DELETE /api/admin/documents/:id` | Delete |
| `POST /api/admin/documents/categories` | Add category |
| `PATCH /api/admin/documents/categories/:id` | Edit category |
| `DELETE /api/admin/documents/categories/:id` | Delete category |

After any of the above succeeds, the organize view refetches `/api/admin/documents/organize` to rehydrate.

### Client state

```ts
// Inside organize-view.tsx
const [tree, setTree] = useState<OrganizeTree | null>(null);
const [activeTab, setActiveTab] = useState<DocumentSection>("office");
const [previewMode, setPreviewMode] = useState(false);
const [search, setSearch] = useState("");
const snapshotRef = useRef<OrganizeTree | null>(null);
```

No global state — this view owns its data exclusively.

### Optimistic updates

On every successful drop:

1. **Snapshot** the current tree to `snapshotRef.current`.
2. **Compute new tree** via pure functions in `lib/documents-organize/reorder.ts`.
3. **Update local state** immediately (zero-latency visual).
4. **Fire API** (`categories/reorder`, `memberships/reorder`, or `memberships/move`).
5. On success → toast: "Order saved".
6. On failure → revert to `snapshotRef.current`, toast: "Couldn't save order" with a Retry button.

---

## Error handling & edge cases

### API errors

| Scenario | Behavior |
|---|---|
| Reorder API 4xx / 5xx | Revert local state. Toast with Retry. |
| Network failure | Same as above. |
| Validation error (409) | Toast with server message. Refetch tree to reconcile. |
| Auth expired (401) | Redirect to login (same as existing admin pages). |

### Race conditions

- **Sequential drags:** second drag is queued; if the first fails, the queue clears and both revert.
- **Concurrent admins:** last-write-wins on `sortOrder`. Cosmetic conflict only. Reconciled on next refetch (drawer close, delete, publish toggle, tab change).
- **Refetch during drag:** blocked — refetches only happen after drag completes.

### Drag edge cases

| Scenario | Behavior |
|---|---|
| Drop on origin | No-op, no API call |
| Drop on empty category | Creates membership at `sortOrder: 0` |
| Last card removed from a category | Category becomes empty; shows dashed placeholder; not auto-deleted |
| Doc in multiple categories dragged in one | Only that membership's `sortOrder` changes |
| Category dragged outside section | Blocked visually; snaps back |
| Move to… with no target categories in a section | Submenu shows "No categories in this section — add one first." |
| Delete the only category in a section | Allowed; section shows empty state |

### Preview-mode edge cases

| Scenario | Behavior |
|---|---|
| Toggle Preview mid-drag | Drag cancelled; card snaps back |
| Admin adds draft, then toggles Preview | Draft disappears; brief banner: "Drafts are hidden in preview" |
| Empty section in Preview | Shows agent's actual empty state with inline "Exit preview" link |

### Accessibility failure modes

- Screen reader during drag: live region announces position changes and final drop.
- Reduced motion: animations shorten to 0 ms (layout still shifts, just instantly).

### Server-side integrity guards

Every reorder / move endpoint runs validation inside the Prisma transaction:

- **Reorder:** submitted ID list must equal the set currently in that container. Prevents silent data loss from stale client lists.
- **Move:** `fromCategoryId` must currently contain `documentId`. Prevents phantom moves.
- Validation failure aborts the transaction and returns 409 with a human-readable message.

---

## Testing strategy

### Unit tests (pure functions)

**`src/lib/documents-organize/reorder.test.ts`** — exhaustive coverage:

- `computeCategoryReorder(categories, fromIndex, toIndex)`
- `computeDocReorder(docs, fromIndex, toIndex)`
- `computeCrossCategoryMove(tree, docId, fromCatId, toCatId, toIndex)`
- Edge cases: same-index drop, drop at end, drop on empty category, multi-membership docs

### Integration tests (API routes)

**`src/app/api/admin/documents/categories/reorder/route.test.ts`**
- Happy path: reorder 3 categories, verify `sortOrder` in DB
- Wrong section ID in list → 400
- Missing IDs (list shorter than DB) → 400, no partial update
- Duplicate IDs → 400
- Non-admin user → 403

**`src/app/api/admin/documents/memberships/reorder/route.test.ts`** — same pattern.

**`src/app/api/admin/documents/memberships/move/route.test.ts`**
- Move from Cat A to Cat B; verify both sides re-indexed
- Move a doc not in `fromCategoryId` → 409
- Move into a category the doc already belongs to → merges (no duplicate membership)
- Transaction rollback on mid-operation failure

**`src/app/api/admin/documents/organize/route.test.ts`**
- Returns all sections including empty categories
- Includes drafts
- Respects `sortOrder` at both levels
- Non-admin → 403

### Component tests (React Testing Library)

**`src/components/admin/documents-organize/document-card.test.tsx`**
- Renders name, description, icon
- Draft pill present when unpublished; hidden in Preview
- Quick pill present when `quickAccess`; hidden in Preview
- Ellipsis menu items match spec
- Keyboard: Tab → Space → Escape on drag handle (uses `@dnd-kit` test utilities)

**`src/components/admin/documents-organize/organize-view.test.tsx`**
- Tabs switch sections
- Preview toggle: drafts hidden, empty categories hidden, admin overlays hidden, card-click routes to viewer
- Search fades non-matches to 30% opacity
- Add Document button opens drawer
- API failure: toast + snap-back; Retry re-fires

### E2E tests (Playwright)

**`tests/e2e/admin/documents-organize.spec.ts`**

1. Log in as admin; navigate to `/admin/documents`.
2. Drag card from position 1 to position 3 within a category; reload; verify persistence.
3. Drag document from Category A to Category B within the Office tab; verify move.
4. Reorder categories in a section; reload; verify.
5. Use "Move to…" menu to move a doc from Office tab to Listing tab; switch tabs; verify presence.
6. Toggle Preview as agent; verify drag handles hidden, drafts hidden, add buttons hidden.
7. Keyboard-only flow: Tab → Space → Arrow → Space; verify move landed.

### Manual verification checklist (CLAUDE.md Rule 4 — Playwright MCP after build)

1. Agent page (`/dashboard/agent-hub/documents`) reflects admin's drag changes immediately after refresh.
2. Quick Access section on Resources Hub landing still shows toggled docs.
3. Viewer still loads via card click in Preview mode.
4. Console shows zero errors through a full drag session.
5. Keyboard drag with screen reader (NVDA or VoiceOver) announces each position change.

---

## Non-goals / explicit exclusions

- **No bulk operations** (multi-select drag, bulk publish, CSV import). Single-card workflow only. Bulk editor can be layered later if needed.
- **No undo for reorders.** Failed reorders auto-revert; successful ones are trivially undoable by dragging back.
- **No drag between Office / Listing / Sales tabs.** "Move to…" menu item handles cross-section moves deliberately.
- **No changes to agent-facing UI.** This is admin-only. Agent page (`src/app/dashboard/agent-hub/documents/page.tsx`) is untouched.
- **No new Prisma migrations.** Schema is already sufficient.

---

## Open questions

None at spec time. All decisions are recorded in the Decisions table above.

---

## References

- Prisma schema: `prisma/schema.prisma` (models: `Document`, `DocumentCategory`, `DocumentCategoryMembership`)
- Current admin view: `src/app/admin/documents/documents-admin-view.tsx`
- Agent Document Library page: `src/app/dashboard/agent-hub/documents/page.tsx`
- Agent document list component: `src/components/content/document-list.tsx`
- Existing drawers: `src/components/admin/document-drawer.tsx`, `src/components/admin/document-category-drawer.tsx`
- Related admin delete spec: `docs/superpowers/specs/2026-04-18-admin-document-delete-design.md`
- dnd-kit: https://dndkit.com
