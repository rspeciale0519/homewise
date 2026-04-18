# Admin Document Delete — Design Spec

**Date:** 2026-04-18
**Status:** Approved design, pending implementation plan
**Scope:** Admin UI for deleting documents from the Documents Admin table with typed-confirmation safeguard

## Goal

Give admins a direct, discoverable path to delete a document from the Documents Admin list view (`/admin/documents`), protected by a typed-confirmation modal that prevents accidental permanent deletion.

## Current state

- `DELETE /api/admin/documents/[id]` already exists — removes the Supabase storage object (when `storageProvider="supabase"`) and hard-deletes the `Document` row. Agent favorites/drafts that reference the document are left intact per the existing backend behavior.
- `ConfirmDialog` (Radix AlertDialog wrapper) at `src/components/admin/confirm-dialog.tsx` — used elsewhere in the admin UI.
- A Delete button exists in the `DocumentDrawer` footer (`src/components/admin/document-drawer.tsx`) but requires the admin to open the drawer first. It will be removed in favor of the new canonical path.
- `@radix-ui/react-dropdown-menu` is already a dependency (no new packages required).
- `lucide-react` is already used for icons (`MoreVertical` is available).

## What changes

### 1. New component — `DocumentRowMenu`

**Path:** `src/components/admin/document-row-menu.tsx`

Encapsulates the per-row kebab trigger and dropdown. Accepts the document record and a callback to open the typed-confirm modal. Kept small and single-purpose so future actions (Duplicate, Archive) can be added without touching the admin view.

**Props:**

```ts
interface DocumentRowMenuProps {
  document: DocumentItem;
  onRequestDelete: (doc: DocumentItem) => void;
}
```

**Menu items (initial):**

- **Delete** — red text (`text-red-600`), triggers `onRequestDelete(document)`. That's it for v1.

**Why only one item:** Edit and Toggle Publish are already accessible from the row itself (click row → drawer, click status pill → toggle). Duplicating those into the menu adds noise without adding capability. The dropdown wrapper remains in place so additional actions can be added later without a structural change.

**Visual (brand-matched to `user-menu.tsx` dropdown pattern):**

- **Trigger:** icon-only button, `h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1`. Uses `MoreVertical` from lucide-react at `h-4 w-4`. Wrapped in a `p-1` cell so the full ≥ 40px tap target is honored on touch.
- `aria-label={`Actions for ${document.name}`}` on the trigger; `aria-haspopup="menu"` via Radix.
- Both the trigger and the menu item call `e.stopPropagation()` on `onClick` to prevent the row's drawer-open handler from firing.
- **Dropdown content:** `bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[180px] z-50` with Radix animation: `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 duration-200`. Positioned with `align="end" sideOffset={6}`. Mirrors the existing `user-menu.tsx` visual language so the admin sees one consistent dropdown dialect across the app.
- **Delete item:** `flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700`. Leading `Trash2` icon at `h-4 w-4` using `currentColor` so it picks up the crimson-700 tint on highlight — matching how `user-menu.tsx` treats the Sign Out item (neutral at rest, crimson on engagement). This reads as editorially calm until the admin engages, when the row quietly warns.

### 2. Extended component — `ConfirmDialog`

**Path:** `src/components/admin/confirm-dialog.tsx`

Add an optional `typeToConfirm` prop. When provided, the dialog renders a text input below the message and disables the confirm button until the input value (case-sensitive, trimmed) exactly matches `typeToConfirm`.

**Updated props:**

```ts
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  // New:
  typeToConfirm?: string;   // e.g. "DELETE"
  busy?: boolean;           // loading state
}
```

**Behavior when `typeToConfirm` is set:**

- A small destructive-intent badge appears beside the title: a `h-9 w-9 rounded-full bg-crimson-50 flex items-center justify-center shrink-0` circle containing `<AlertTriangle className="h-5 w-5 text-crimson-600" />`. Title and badge sit in a `flex items-start gap-3` header. Editorial, not theatrical.
- Below the message, a `border-t border-slate-100 pt-4 mt-4` divider sets off the confirmation zone from the message zone.
- Instruction line: `text-xs font-medium uppercase tracking-[0.12em] text-slate-400` that reads `Type DELETE to confirm` (the `DELETE` token is wrapped in a `font-mono text-crimson-600 normal-case tracking-normal` span so the literal word stands out).
- Autofocused input: `font-mono text-sm h-10 px-3 w-full border border-slate-200 rounded-lg placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-crimson-600 focus:border-crimson-300 transition-all`. Placeholder is the literal string `DELETE`. When the input value matches, the border quietly shifts to `border-crimson-300` and the background to `bg-crimson-50/30` — a subtle "armed" state, not a flash.
- Confirm button: `px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors`. Disabled until the input matches.
- **Enter** in the input fires the confirm handler when the match is valid.
- On ESC / overlay click / Cancel, the input resets (so reopening starts empty).

**Behavior when `busy` is true:**

- Confirm button reads `"{confirmLabel}…"` (e.g., "Deleting…"), shows a leading `h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin` spinner, is disabled. Style matches the page-level loading spinner already used in `documents-admin-view.tsx` so it reads as one family.
- Cancel button is disabled (`text-slate-300 cursor-not-allowed`).
- Overlay click and ESC are ignored (`onOpenChange` guard) to prevent accidental dismissal mid-request.

**Non-typed-confirm usage is unchanged** — existing callers of `ConfirmDialog` continue to work without modification.

**Incidental brand upgrade:** the existing `ConfirmDialog` confirm button currently uses `bg-red-600 hover:bg-red-700` (Tailwind's generic red). It will be switched to `bg-crimson-600 hover:bg-crimson-700` to pull the Homewise brand crimson through. This affects any existing caller (e.g., category deletion), and is the only allowable scope creep — it's a one-token swap that strengthens brand consistency across the admin.

### 3. Modified — `DocumentsAdminView`

**Path:** `src/app/admin/documents/documents-admin-view.tsx`

- Add a trailing table column (no header label, narrow width) containing `<DocumentRowMenu document={doc} onRequestDelete={openDeleteConfirm} />`.
- Update the existing table `colSpan={5}` in the empty state to `colSpan={6}`.
- Add state: `pendingDelete: DocumentItem | null` and `deleting: boolean`.
- Add `openDeleteConfirm(doc)` and `handleConfirmDelete()` handlers:
  - `handleConfirmDelete` calls `adminFetch(`/api/admin/documents/${pendingDelete.id}`, { method: "DELETE" })`, sets `deleting` during the call, toasts success/error, refetches on success, closes the modal on success, leaves it open on error.
- Render one `<ConfirmDialog>` at the view level with the `typeToConfirm="DELETE"` and `busy={deleting}` props bound to the pending state.

### 4. Modified — `DocumentDrawer`

**Path:** `src/components/admin/document-drawer.tsx`

- Remove the Delete button from the drawer footer and the `confirmDelete` state, `handleDelete` function, and the trailing `<ConfirmDialog>` usage that's currently tied to it. The drawer is now edit/create only; deletion lives in the row menu.
- No other drawer behavior changes.

## Interaction flow

1. Admin visits `/admin/documents`.
2. Admin clicks the kebab (`⋯`) at the end of a row. Dropdown opens.
3. Admin clicks **Delete**. Dropdown closes, typed-confirm modal opens.
4. Modal shows the document name in the warning message and the `"Type DELETE to confirm"` input.
5. Admin types `DELETE`. The red **Delete permanently** button enables.
6. Admin clicks **Delete permanently** (or presses Enter).
7. Button shows "Deleting…" with spinner. Cancel is disabled. Overlay/ESC ignored.
8. On success → toast "Document deleted", modal closes, table refetches.
9. On error → toast with error message, modal stays open, input keeps its value, buttons re-enable for retry.

## Confirm modal content

- **Title:** "Delete Document"
- **Message:** `This will permanently delete "{name}" and its file. Agent favorites and drafts that reference this document will remain but show as missing. This cannot be undone.`
- **Prompt line:** `Type DELETE to confirm.`
- **Confirm label:** "Delete permanently"
- **Cancel label:** "Cancel" (existing)

## Accessibility

- Kebab trigger has a descriptive `aria-label` that includes the document name.
- The dropdown menu gets keyboard navigation, focus trap, and roving tabindex for free via Radix.
- The typed-confirm input is autofocused when the modal opens.
- The confirm button's disabled state is communicated through the `disabled` attribute (not just visual styling).
- Enter in the input submits when the match is valid — no mouse required.

## Edge cases & failure modes

| Scenario | Behavior |
|---|---|
| API returns 404 (already deleted) | Toast the error, refetch list so the row disappears, close the modal. |
| API returns 500 or network failure | Toast the error, keep modal open with input preserved so admin can retry. |
| Admin closes modal mid-delete | Not possible — ESC/overlay/Cancel disabled while `busy`. |
| Document has `storageProvider="local"` | Backend already handles this (skips Supabase removal). No frontend difference. |
| Double-click on Delete permanently | Prevented by the `busy` flag disabling the button on first click. |

## Brand alignment summary

The design inherits the established Homewise admin language rather than inventing a new one:

| System token | Source | Applied here |
|---|---|---|
| `shadow-dropdown` (navy-tinted, defined in `tailwind.config.ts`) | User menu dropdown | Kebab menu content shadow |
| `bg-white/95 backdrop-blur-lg rounded-xl border border-slate-100` | User menu dropdown | Kebab menu surface |
| Radix animations: `fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200` | User menu dropdown | Kebab open/close motion |
| `hover:bg-crimson-50 hover:text-crimson-700` on destructive items | User menu "Sign Out" item | Kebab "Delete" item |
| `navy-600` focus rings on interactive elements | Admin inputs/buttons throughout | Kebab trigger, cancel button |
| `crimson-600` for destructive CTAs | Brand palette in `tailwind.config.ts` | Confirm button (upgraded from generic `red-600`) |
| `shadow-elevated` on modals | Existing `ConfirmDialog` | Unchanged |
| DM Sans UI body type + monospace for "DELETE" token | `font-sans` default + `font-mono` utility | Instruction + input use mono to evoke a signed-document friction |
| `AlertTriangle` in a small `bg-crimson-50` circle | New, editorial restraint | Typed-confirm modal header |

No new colors, no new shadows, no new animation primitives. Every token already exists in the codebase.

## Out of scope (explicitly)

- Bulk delete via checkbox selection (Approach B from brainstorming — can be layered on later).
- Soft-delete / archive. Current backend hard-deletes; this spec preserves that.
- Duplicate action in the kebab menu.
- Moving Edit or Toggle Publish into the kebab menu (row click + status pill remain).
- Changes to the DELETE API route.

## Acceptance criteria

1. A kebab menu appears at the end of each document row in `/admin/documents` across all tabs (Office, Listing, Sales, Quick Access).
2. Clicking the kebab does not also open the drawer.
3. The kebab menu contains a single Delete item styled in red.
4. Clicking Delete opens a modal that requires typing `DELETE` (case-sensitive) before the confirm button enables.
5. Pressing Enter in the input with a valid match triggers deletion.
6. While the delete request is in flight, the confirm button shows a loading state, Cancel is disabled, and the modal cannot be dismissed.
7. On success, the row disappears from the table and a success toast shows.
8. On error, the modal remains open with input preserved and an error toast shows.
9. The Delete button in the document drawer footer is removed.
10. Screen readers announce the kebab trigger as "Actions for \<document name\>".
