# Admin Document Delete — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a row-level kebab menu with typed-confirmation delete to `/admin/documents` so admins can permanently delete documents in 3 clicks with a "DELETE" typed gate.

**Architecture:** Extend the existing Radix-based `ConfirmDialog` with an optional `typeToConfirm` gate and a `busy` loading state (one prop each, no new component). Add a `DocumentRowMenu` that uses `@radix-ui/react-dropdown-menu` and mirrors the visual language of `src/components/layout/user-menu.tsx` so the new surface reads as native to the admin. Delete the drawer's hidden Delete button so there's a single canonical path.

**Tech Stack:** Next.js 16 App Router · React 19 · TypeScript · Tailwind (custom `navy`/`crimson`/`cream`/`gold` palette) · `@radix-ui/react-alert-dialog` (existing `ConfirmDialog`) · `@radix-ui/react-dropdown-menu` (already in `package.json`) · `lucide-react` icons · Vitest + Testing Library (jsdom).

**Spec:** `docs/superpowers/specs/2026-04-18-admin-document-delete-design.md`

**Branch:** `feature/admin-document-delete` (via `/git-workflow-planning:start feature admin-document-delete`)

---

## File Map

**Create:**
- `src/components/admin/document-row-menu.tsx` — kebab trigger + Radix DropdownMenu with Delete item. ~60 LOC.
- `tests/components/admin/confirm-dialog.test.tsx` — unit tests for the extended ConfirmDialog.
- `tests/components/admin/document-row-menu.test.tsx` — unit tests for the row menu.

**Modify:**
- `src/components/admin/confirm-dialog.tsx` — add `typeToConfirm?: string` and `busy?: boolean` props; swap `red-600` → `crimson-600` brand token.
- `src/app/admin/documents/documents-admin-view.tsx` — add kebab column, `pendingDelete`/`deleting` state, a view-level `ConfirmDialog`, delete handler.
- `src/components/admin/document-drawer.tsx` — remove the drawer-footer Delete button, the `confirmDelete` state, `handleDelete`, and the trailing `<ConfirmDialog>` usage.

---

## Phase 1 — Extend ConfirmDialog with typed-confirm + busy + brand crimson

### Task 1.1: Write the failing ConfirmDialog tests

**Files:**
- Create: `tests/components/admin/confirm-dialog.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";

const baseProps = {
  open: true,
  title: "Delete Document",
  message: "This cannot be undone.",
  confirmLabel: "Delete permanently",
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

describe("ConfirmDialog — basic mode (no typeToConfirm)", () => {
  it("renders title, message, confirm and cancel buttons", () => {
    render(<ConfirmDialog {...baseProps} />);
    expect(screen.getByText("Delete Document")).toBeInTheDocument();
    expect(screen.getByText("This cannot be undone.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete permanently" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("calls onConfirm when confirm button clicked", () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole("button", { name: "Delete permanently" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe("ConfirmDialog — typeToConfirm gate", () => {
  it("disables the confirm button until input matches exactly", () => {
    render(<ConfirmDialog {...baseProps} typeToConfirm="DELETE" />);
    const button = screen.getByRole("button", { name: "Delete permanently" });
    const input = screen.getByPlaceholderText("DELETE") as HTMLInputElement;

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "delete" } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE " } });
    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: "DELETE" } });
    expect(button).toBeEnabled();
  });

  it("fires onConfirm when Enter is pressed with a valid match", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog {...baseProps} onConfirm={onConfirm} typeToConfirm="DELETE" />,
    );
    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "DELETE" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("does NOT fire onConfirm on Enter when input is invalid", () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog {...baseProps} onConfirm={onConfirm} typeToConfirm="DELETE" />,
    );
    const input = screen.getByPlaceholderText("DELETE");
    fireEvent.change(input, { target: { value: "delete" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

describe("ConfirmDialog — busy state", () => {
  it("disables both buttons and shows loading label when busy", () => {
    render(
      <ConfirmDialog
        {...baseProps}
        typeToConfirm="DELETE"
        busy={true}
      />,
    );
    const confirmButton = screen.getByRole("button", { name: /Delete permanently/ });
    const cancelButton = screen.getByRole("button", { name: "Cancel" });
    expect(confirmButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    expect(confirmButton.textContent).toMatch(/…/);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/admin/confirm-dialog.test.tsx`
Expected: FAIL on the `typeToConfirm` and `busy` tests (props don't exist yet). The two "basic mode" tests should pass against the current implementation.

- [ ] **Step 3: Implement the extended ConfirmDialog**

Replace the entire contents of `src/components/admin/confirm-dialog.tsx` with:

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { AlertTriangle } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  typeToConfirm?: string;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  typeToConfirm,
  busy = false,
}: ConfirmDialogProps) {
  const [typed, setTyped] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setTyped("");
    }
  }, [open]);

  useEffect(() => {
    if (open && typeToConfirm && inputRef.current) {
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open, typeToConfirm]);

  const matches = typeToConfirm ? typed === typeToConfirm : true;
  const canConfirm = matches && !busy;

  const handleConfirm = () => {
    if (!canConfirm) return;
    void onConfirm();
  };

  const handleOpenChange = (next: boolean) => {
    if (busy) return;
    if (!next) onCancel();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && canConfirm) {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <AlertDialog.Root open={open} onOpenChange={handleOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/50 z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-200" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-xl max-w-sm w-full p-6 shadow-elevated z-50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 duration-200">
          <div className="flex items-start gap-3">
            {typeToConfirm && (
              <div className="h-9 w-9 rounded-full bg-crimson-50 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-crimson-600" />
              </div>
            )}
            <div className="flex-1">
              <AlertDialog.Title className="font-semibold text-navy-700 text-lg">
                {title}
              </AlertDialog.Title>
              <AlertDialog.Description className="text-sm text-slate-600 mt-2">
                {message}
              </AlertDialog.Description>
            </div>
          </div>

          {typeToConfirm && (
            <div className="border-t border-slate-100 pt-4 mt-4">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">
                Type{" "}
                <span className="font-mono text-crimson-600 normal-case tracking-normal">
                  {typeToConfirm}
                </span>{" "}
                to confirm
              </p>
              <input
                ref={inputRef}
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={typeToConfirm}
                disabled={busy}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className={`mt-2 font-mono text-sm h-10 px-3 w-full border rounded-lg placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-crimson-600 transition-all ${
                  matches
                    ? "border-crimson-300 bg-crimson-50/30"
                    : "border-slate-200"
                }`}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4 items-center">
            <button
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
            >
              {busy && (
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {busy ? `${confirmLabel}…` : confirmLabel}
            </button>
            <button
              onClick={onCancel}
              disabled={busy}
              className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 disabled:text-slate-300 disabled:cursor-not-allowed"
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/admin/confirm-dialog.test.tsx`
Expected: PASS — all tests green.

- [ ] **Step 5: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

**→ CHECKPOINT:** `/git-workflow-planning:checkpoint 1 extend confirm dialog with typed confirm and busy state`

---

## Phase 2 — Create DocumentRowMenu

### Task 2.1: Write failing DocumentRowMenu tests

**Files:**
- Create: `tests/components/admin/document-row-menu.test.tsx`

- [ ] **Step 1: Create the test file**

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DocumentRowMenu } from "@/components/admin/document-row-menu";
import type { DocumentItem } from "@/app/admin/documents/types";

const makeDoc = (overrides: Partial<DocumentItem> = {}): DocumentItem => ({
  id: "doc-1",
  name: "Lead Paint Disclosure",
  slug: "lead-paint-disclosure",
  description: null,
  url: null,
  external: false,
  storageKey: "documents/abc-lead-paint-disclosure.pdf",
  storageProvider: "supabase",
  mimeType: "application/pdf",
  sizeBytes: 412000,
  sortOrder: 0,
  published: true,
  quickAccess: false,
  createdAt: "2026-04-01T00:00:00.000Z",
  updatedAt: "2026-04-01T00:00:00.000Z",
  categories: [],
  ...overrides,
});

// NOTE: Radix DropdownMenu relies on pointer events that jsdom doesn't fully
// emulate, so we don't test the open-menu + click-Delete flow here. That path
// is covered by the manual Playwright verification in Phase 3.3. The tests
// below focus on the parts of DocumentRowMenu we own: the trigger's a11y
// label and the stopPropagation contract with the parent row.

describe("DocumentRowMenu", () => {
  it("renders trigger with a document-specific aria-label", () => {
    render(<DocumentRowMenu document={makeDoc()} onRequestDelete={vi.fn()} />);
    expect(
      screen.getByRole("button", { name: "Actions for Lead Paint Disclosure" }),
    ).toBeInTheDocument();
  });

  it("reflects the document name in the aria-label", () => {
    render(
      <DocumentRowMenu
        document={makeDoc({ name: "Broker Relationship Disclosure" })}
        onRequestDelete={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("button", { name: "Actions for Broker Relationship Disclosure" }),
    ).toBeInTheDocument();
  });

  it("stops trigger clicks from propagating to parent handlers", () => {
    const parentClick = vi.fn();
    const { container } = render(
      <div onClick={parentClick}>
        <DocumentRowMenu document={makeDoc()} onRequestDelete={vi.fn()} />
      </div>,
    );
    const trigger = container.querySelector(
      'button[aria-label^="Actions for"]',
    ) as HTMLButtonElement;
    fireEvent.click(trigger);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/components/admin/document-row-menu.test.tsx`
Expected: FAIL with "Cannot find module '@/components/admin/document-row-menu'".

- [ ] **Step 3: Create the DocumentRowMenu component**

Create `src/components/admin/document-row-menu.tsx`:

```tsx
"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { MoreVertical, Trash2 } from "lucide-react";
import type { DocumentItem } from "@/app/admin/documents/types";

interface DocumentRowMenuProps {
  document: DocumentItem;
  onRequestDelete: (doc: DocumentItem) => void;
}

export function DocumentRowMenu({ document, onRequestDelete }: DocumentRowMenuProps) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label={`Actions for ${document.name}`}
          onClick={(e) => e.stopPropagation()}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-navy-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600 focus-visible:ring-offset-1"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-lg rounded-xl shadow-dropdown border border-slate-100 py-2 min-w-[180px] z-50 data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 fade-out-0 zoom-in-95 zoom-out-95 data-[side=bottom]:slide-in-from-top-2 duration-200"
        >
          <DropdownMenu.Item
            onSelect={(e) => {
              e.preventDefault();
              onRequestDelete(document);
            }}
            className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-crimson-50 hover:text-crimson-700 transition-colors outline-none cursor-pointer data-[highlighted]:bg-crimson-50 data-[highlighted]:text-crimson-700"
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

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/components/admin/document-row-menu.test.tsx`
Expected: PASS — all four tests green.

- [ ] **Step 5: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

**→ CHECKPOINT:** `/git-workflow-planning:checkpoint 2 add document row menu component`

---

## Phase 3 — Wire into DocumentsAdminView + remove drawer delete

### Task 3.1: Add the kebab column, delete state, and modal to DocumentsAdminView

**Files:**
- Modify: `src/app/admin/documents/documents-admin-view.tsx`

- [ ] **Step 1: Add the import and state**

At the top of `src/app/admin/documents/documents-admin-view.tsx`, after the existing `import { DocumentCategoryDrawer } ...` line, add:

```tsx
import { DocumentRowMenu } from "@/components/admin/document-row-menu";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
```

Inside the `DocumentsAdminView` function component, after the existing `useState` declarations (right after `const [editingCat, setEditingCat] = useState<DocumentCategoryItem | null>(null);`), add:

```tsx
  const [pendingDelete, setPendingDelete] = useState<DocumentItem | null>(null);
  const [deleting, setDeleting] = useState(false);
```

- [ ] **Step 2: Add the delete handler**

After the existing `handleTogglePublished` function, add:

```tsx
  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminFetch(`/api/admin/documents/${pendingDelete.id}`, {
        method: "DELETE",
      });
      toast("Document deleted", "success");
      setPendingDelete(null);
      fetchAll();
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setDeleting(false);
    }
  };
```

- [ ] **Step 3: Add the kebab column to the table header**

Find the existing table header row in the documents table (around line 192-200) that ends with the Status `<th>`. Add one more `<th>` immediately after it:

```tsx
                    <th className="text-left py-3 px-4 font-semibold text-slate-600 whitespace-nowrap">Status</th>
                    <th className="w-12" aria-hidden="true" />
                  </tr>
```

- [ ] **Step 4: Add the kebab cell to each row and update the empty-state colSpan**

Find the existing row `<tr>` that closes after the Status `<td>`. Add a new `<td>` immediately after the Status cell:

```tsx
                      <td className="py-2 px-2 w-12">
                        <div
                          className="inline-flex"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DocumentRowMenu
                            document={doc}
                            onRequestDelete={(d) => setPendingDelete(d)}
                          />
                        </div>
                      </td>
```

Then update the empty state `colSpan={5}` to `colSpan={6}`.

- [ ] **Step 5: Mount the ConfirmDialog at the view level**

Immediately after the existing `<DocumentCategoryDrawer ... />` mount (near the end of the returned JSX, before the closing `</div>`), add:

```tsx
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
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!deleting) setPendingDelete(null);
        }}
      />
```

- [ ] **Step 6: Run type-check and lint**

Run: `npm run type-check && npm run lint`
Expected: no errors.

### Task 3.2: Remove the drawer's delete functionality

**Files:**
- Modify: `src/components/admin/document-drawer.tsx`

- [ ] **Step 1: Remove the ConfirmDialog import and state**

In `src/components/admin/document-drawer.tsx`:
- Delete the line `import { ConfirmDialog } from "@/components/admin/confirm-dialog";` (line 5).
- Delete the line `const [confirmDelete, setConfirmDelete] = useState(false);` (line 62 in the current file).

- [ ] **Step 2: Remove the handleDelete function**

Delete the entire `handleDelete` function block (currently lines ~220-231), which begins with `const handleDelete = async () => {` and ends with `};` after `setConfirmDelete(false);`.

- [ ] **Step 3: Remove the Delete button from the drawer footer**

Delete the entire block (currently lines ~463-470):

```tsx
              {item && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto px-4 py-2 text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Delete
                </button>
              )}
```

- [ ] **Step 4: Remove the trailing ConfirmDialog usage**

Delete the entire `<ConfirmDialog ... />` block at the end of the return (currently lines ~476-483), leaving only the closing `</>` fragment.

- [ ] **Step 5: Verify `adminFetch` is still referenced**

The drawer still uses `adminFetch` in its `handleUpload` and `handleSave` functions. The `AdminFetchError` import also remains in use. No additional import cleanup needed.

- [ ] **Step 6: Run type-check, lint, and full test suite**

Run: `npm run type-check && npm run lint && npm run test:run`
Expected: no type errors, no lint errors, all existing and new tests pass.

### Task 3.3: Manual browser verification

- [ ] **Step 1: Start the dev server (or confirm one is running)**

Run: `npm run dev`
Expected: server starts on http://localhost:3000 (or a free alternative port).

- [ ] **Step 2: Navigate to `/admin/documents` and verify all acceptance criteria**

Using Playwright MCP (per project Rule 4), verify each criterion from the spec:

1. A kebab (`⋯`) button appears at the end of each row on the Office, Listing, Sales, and Quick Access tabs.
2. Clicking the kebab opens a dropdown with one red-highlighted "Delete" item and does NOT open the edit drawer.
3. Clicking Delete opens the confirm modal. The "Delete permanently" button is disabled.
4. Typing `delete` (lowercase) keeps the button disabled.
5. Typing `DELETE` enables the button and subtly tints the input border crimson.
6. Pressing Enter in the input fires the delete when the match is valid.
7. During the request, the button reads "Deleting…" with a spinner; Cancel is disabled; ESC does nothing.
8. On success, the row disappears from the table and a success toast shows.
9. To test error handling: temporarily block the DELETE request in DevTools (or disconnect the network), retry, confirm the modal stays open with input preserved and an error toast shows.
10. Open the drawer for any document — the Delete button at the footer should be gone.

Capture any console errors via `mcp__playwright__browser_console_messages`.

- [ ] **Step 3: Leave the browser open (per project Rule 4)**

Do not close the browser. Await user confirmation.

**→ CHECKPOINT:** `/git-workflow-planning:checkpoint 3 wire kebab menu into admin view and remove drawer delete`

---

## Phase 4 — Finish

- [ ] **Step 1: Final verification**

Run: `npm run verify`
Expected: lint + type-check + tests + build all succeed.

- [ ] **Step 2: Run the finish command**

Run: `/git-workflow-planning:finish`
Expected: pushes the branch, opens PR, asks before merging.

---

## Acceptance Criteria → Task Mapping

| # | Criterion | Covered by |
|---|---|---|
| 1 | Kebab menu on every row across all tabs | Task 3.1 Steps 3–4 + Task 3.3 Step 2.1 |
| 2 | Kebab click doesn't open drawer | Task 2.1 Step 3 (stopPropagation in component) + Task 3.1 Step 4 (stopPropagation on cell) + Task 3.3 Step 2.2 |
| 3 | Single red Delete item | Task 2.1 Step 3 + Task 3.3 Step 2.2 |
| 4 | Requires typing `DELETE` case-sensitive | Task 1.1 Step 3 + Task 3.1 Step 5 |
| 5 | Enter key submits on valid match | Task 1.1 Step 3 (handleKeyDown) + Task 3.3 Step 2.6 |
| 6 | Loading state + modal undismissable mid-request | Task 1.1 Step 3 (`busy` behavior) + Task 3.3 Step 2.7 |
| 7 | Row disappears + toast on success | Task 3.1 Step 2 + Task 3.3 Step 2.8 |
| 8 | Modal stays open + input preserved on error | Task 3.1 Step 2 (input not reset in catch) + Task 3.3 Step 2.9 |
| 9 | Drawer Delete button removed | Task 3.2 |
| 10 | aria-label on kebab trigger | Task 2.1 Step 3 |

---

## Notes for the Implementer

- **File length guard:** `documents-admin-view.tsx` is currently 325 LOC — after Task 3.1 adds ~25 LOC, it will be ~350 LOC, still under the 450 LOC limit. No split needed.
- **File length guard:** `document-drawer.tsx` is currently ~487 LOC and gets *smaller* after Task 3.2. No action.
- **No new dependencies.** `@radix-ui/react-dropdown-menu`, `lucide-react`, `@testing-library/react`, and `vitest` are all already installed.
- **Radix `DropdownMenu.Item`**: use `onSelect` (not `onClick`) for activation — it handles Enter/Space automatically. `e.preventDefault()` inside `onSelect` prevents the default close-then-bubble behavior so the delete handler runs cleanly.
- **Input reset on error:** the spec requires that the typed value persist across a failed request. In Task 3.1 Step 2, only `setPendingDelete(null)` is called on success — in the catch branch it is NOT called, so the modal stays open and the typed value (internal to ConfirmDialog) remains because the `open` prop never flips false. Confirmed by the `useEffect` in `ConfirmDialog` which only resets `typed` when `open` transitions.
