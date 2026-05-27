"use client";

import { useCallback, useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { adminFetch } from "@/lib/admin-fetch";
import { useToast } from "@/components/admin/admin-toast";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sortOrder: number;
  _count: { content: number };
}

interface TrainingCategoriesModalProps {
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Lightweight CRUD UI for TrainingCategory rows. Surfaces:
 * - The full list (sorted by sortOrder asc, then name).
 * - Inline "New category" form with name + optional description.
 * - Per-row rename / delete actions with optimistic refetch.
 * - A doc-count badge so admins can see what would orphan on delete.
 */
export function TrainingCategoriesModal({
  open,
  onClose,
  onChanged,
}: TrainingCategoriesModalProps) {
  const { toast } = useToast();
  const [rows, setRows] = useState<CategoryRow[] | null>(null);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch<CategoryRow[]>(
        "/api/admin/training/categories",
      );
      setRows(data);
    } catch (err) {
      toast((err as Error).message, "error");
    }
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    void refresh();
  }, [open, refresh]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await adminFetch("/api/admin/training/categories", {
        method: "POST",
        body: JSON.stringify({ name: newName.trim() }),
      });
      setNewName("");
      await refresh();
      onChanged();
      toast("Category created", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleRename(row: CategoryRow) {
    const next = window.prompt("Rename category", row.name);
    if (next === null) return;
    const name = next.trim();
    if (!name || name === row.name) return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/training/categories/${row.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refresh();
      onChanged();
      toast("Category renamed", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(row: CategoryRow) {
    if (
      !window.confirm(
        row._count.content > 0
          ? `Delete "${row.name}"? ${row._count.content} content piece(s) will be uncategorized.`
          : `Delete "${row.name}"?`,
      )
    )
      return;
    setBusy(true);
    try {
      await adminFetch(`/api/admin/training/categories/${row.id}`, {
        method: "DELETE",
      });
      await refresh();
      onChanged();
      toast("Category deleted", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-1.5rem,32rem)] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl z-[51] focus:outline-none">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <Dialog.Title className="text-lg font-serif font-semibold text-navy-700">
              Manage categories
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label="Close"
                className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </Dialog.Close>
          </div>

          <form
            onSubmit={handleCreate}
            className="flex items-center gap-2 px-5 py-4 border-b border-slate-100"
          >
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New category name…"
              className="flex-1 h-9 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
            />
            <button
              type="submit"
              disabled={busy || !newName.trim()}
              className="inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-white bg-crimson-600 rounded-lg hover:bg-crimson-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add
            </button>
          </form>

          <ul className="divide-y divide-slate-100">
            {rows === null ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">
                Loading…
              </li>
            ) : rows.length === 0 ? (
              <li className="px-5 py-6 text-sm text-slate-400 text-center">
                No categories yet
              </li>
            ) : (
              rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-700 truncate">
                      {row.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">
                      {row._count.content}{" "}
                      {row._count.content === 1 ? "item" : "items"}
                      {" · "}
                      <span className="font-mono">/{row.slug}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRename(row)}
                    disabled={busy}
                    aria-label={`Rename ${row.name}`}
                    className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-navy-600 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(row)}
                    disabled={busy}
                    aria-label={`Delete ${row.name}`}
                    className="h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-md transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
