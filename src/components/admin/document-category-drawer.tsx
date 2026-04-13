"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { SlugField } from "@/components/admin/slug-field";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch, AdminFetchError } from "@/lib/admin-fetch";
import { slugify } from "@/lib/slug/slugify";
import type {
  DocumentCategoryItem,
  DocumentSection,
} from "@/app/admin/documents/types";

interface DocumentCategoryDrawerProps {
  open: boolean;
  onClose: () => void;
  item: DocumentCategoryItem | null;
  onSaved: () => void;
}

const INPUT_CLASS =
  "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600";

const SECTION_OPTIONS: Array<{ value: DocumentSection; label: string }> = [
  { value: "office", label: "Office" },
  { value: "listing", label: "Listing" },
  { value: "sales", label: "Sales" },
];

export function DocumentCategoryDrawer({
  open,
  onClose,
  item,
  onSaved,
}: DocumentCategoryDrawerProps) {
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAutoSync, setSlugAutoSync] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [section, setSection] = useState<DocumentSection>("office");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;
    setSlugError(null);
    if (item) {
      setTitle(item.title);
      setSlug(item.slug);
      setSlugAutoSync(false);
      setSection(item.section);
      setDescription(item.description ?? "");
      setSortOrder(String(item.sortOrder));
    } else {
      setTitle("");
      setSlug("");
      setSlugAutoSync(true);
      setSection("office");
      setDescription("");
      setSortOrder("0");
    }
  }, [open, item]);

  useEffect(() => {
    if (!slugAutoSync) return;
    setSlug(slugify(`${section}-${title}`));
  }, [title, section, slugAutoSync]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    if (!title.trim()) {
      toast("Title is required", "error");
      return;
    }
    setSaving(true);
    setSlugError(null);
    try {
      const payload = {
        title: title.trim(),
        slug: slug || undefined,
        description: description || null,
        section,
        sortOrder: Number(sortOrder) || 0,
      };
      if (item) {
        await adminFetch(`/api/admin/documents/categories/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast("Category updated", "success");
      } else {
        await adminFetch("/api/admin/documents/categories", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Category created", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      const fetchErr = err as AdminFetchError;
      if (fetchErr.field === "slug") setSlugError(fetchErr.message);
      else toast(fetchErr.message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await adminFetch(`/api/admin/documents/categories/${item.id}`, {
        method: "DELETE",
      });
      toast("Category deleted", "success");
      onSaved();
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setConfirmDelete(false);
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
          <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-md bg-white shadow-2xl flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <Dialog.Title className="font-semibold text-navy-700 text-lg">
                {item ? `Edit: ${item.title}` : "New Category"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button
                  className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                  aria-label="Close"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="e.g. Listing Agreements"
                />
              </div>

              <SlugField
                value={slug}
                onChange={(next) => { setSlug(next); setSlugError(null); }}
                onUserEdit={() => setSlugAutoSync(false)}
                title={`${section}-${title}`}
                autoSync={slugAutoSync}
                onResetAutoSync={() => {
                  setSlugAutoSync(true);
                  setSlug(slugify(`${section}-${title}`));
                  setSlugError(null);
                }}
                routePrefix="/dashboard/documents/"
                error={slugError}
                helperText="Only used internally for now; URLs will resolve to individual documents."
              />

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Section</label>
                <select
                  value={section}
                  onChange={(e) => setSection(e.target.value as DocumentSection)}
                  className={INPUT_CLASS}
                >
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                  placeholder="Shown under the category title"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Sort Order</label>
                <input
                  type="number"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  className={INPUT_CLASS}
                  min={0}
                />
              </div>
            </div>

            <div className="border-t border-slate-200 p-4 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
              {item && (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="ml-auto px-4 py-2 text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Delete
                </button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Category"
        message={`Delete the "${title}" category? Documents in this category must be removed first.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
