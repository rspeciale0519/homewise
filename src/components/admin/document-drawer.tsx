"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { SlugField } from "@/components/admin/slug-field";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch, AdminFetchError } from "@/lib/admin-fetch";
import { slugify } from "@/lib/slug/slugify";
import type {
  DocumentCategoryItem,
  DocumentItem,
  DocumentSection,
} from "@/app/admin/documents/types";

interface DocumentDrawerProps {
  open: boolean;
  onClose: () => void;
  item: DocumentItem | null;
  categories: DocumentCategoryItem[];
  onSaved: () => void;
  defaultSection: DocumentSection;
}

const INPUT_CLASS =
  "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600";

const SECTION_OPTIONS: Array<{ value: DocumentSection; label: string }> = [
  { value: "office", label: "Office" },
  { value: "listing", label: "Listing" },
  { value: "sales", label: "Sales" },
];

type SourceKind = "external" | "upload";

export function DocumentDrawer({
  open,
  onClose,
  item,
  categories,
  onSaved,
  defaultSection,
}: DocumentDrawerProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugAutoSync, setSlugAutoSync] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<DocumentSection>(defaultSection);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [sourceKind, setSourceKind] = useState<SourceKind>("upload");
  const [externalUrl, setExternalUrl] = useState("");
  const [storageKey, setStorageKey] = useState<string | null>(null);
  const [storageProvider, setStorageProvider] = useState<"local" | "supabase">("local");
  const [uploadedName, setUploadedName] = useState<string | null>(null);
  const [published, setPublished] = useState(true);
  const [quickAccess, setQuickAccess] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const availableCategories = useMemo(
    () => categories.filter((c) => c.section === section),
    [categories, section],
  );

  useEffect(() => {
    if (!open) return;
    setSlugError(null);
    if (item) {
      setName(item.name);
      setSlug(item.slug);
      setSlugAutoSync(false);
      setDescription(item.description ?? "");
      const primarySection = item.categories[0]?.section ?? defaultSection;
      setSection(primarySection);
      setSelectedCategoryIds(item.categories.map((c) => c.id));
      if (item.external && item.url) {
        setSourceKind("external");
        setExternalUrl(item.url);
        setStorageKey(null);
        setUploadedName(null);
      } else {
        setSourceKind("upload");
        setExternalUrl("");
        setStorageKey(item.storageKey);
        setStorageProvider((item.storageProvider as "local" | "supabase") ?? "local");
        setUploadedName(item.storageKey ? item.storageKey.split("/").pop() ?? item.storageKey : null);
      }
      setPublished(item.published);
      setQuickAccess(item.quickAccess);
    } else {
      setName("");
      setSlug("");
      setSlugAutoSync(true);
      setDescription("");
      setSection(defaultSection);
      setSelectedCategoryIds([]);
      setSourceKind("upload");
      setExternalUrl("");
      setStorageKey(null);
      setStorageProvider("local");
      setUploadedName(null);
      setPublished(true);
      setQuickAccess(false);
    }
  }, [open, item, defaultSection]);

  useEffect(() => {
    if (!slugAutoSync) return;
    setSlug(slugify(name));
  }, [name, slugAutoSync]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const { uploadUrl, storageKey: key, storageProvider: provider } =
        await adminFetch<{
          uploadUrl: string;
          storageKey: string;
          storageProvider: "supabase";
        }>("/api/admin/documents/upload", {
          method: "POST",
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });
      await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      setStorageKey(key);
      setStorageProvider(provider);
      setUploadedName(file.name);
      toast("File uploaded", "success");
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setUploading(false);
    }
  }, [toast]);

  const toggleCategory = (id: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    if (selectedCategoryIds.length === 0) {
      toast("Pick at least one category", "error");
      return;
    }

    setSaving(true);
    setSlugError(null);

    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        slug: slug || undefined,
        description: description || undefined,
        categoryIds: selectedCategoryIds,
        published,
        quickAccess,
      };

      if (sourceKind === "external") {
        if (!externalUrl.trim()) {
          toast("External URL is required", "error");
          setSaving(false);
          return;
        }
        payload.external = true;
        payload.url = externalUrl.trim();
        payload.storageKey = null;
      } else {
        if (!storageKey) {
          toast("Upload a file or provide an external URL", "error");
          setSaving(false);
          return;
        }
        payload.external = false;
        payload.url = null;
        payload.storageKey = storageKey;
        payload.storageProvider = storageProvider;
      }

      if (item) {
        await adminFetch(`/api/admin/documents/${item.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast("Document updated", "success");
      } else {
        await adminFetch("/api/admin/documents", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Document created", "success");
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

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
          <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <Dialog.Title className="font-semibold text-navy-700 text-lg">
                {item ? `Edit: ${item.name}` : "New Document"}
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
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={INPUT_CLASS}
                  placeholder="Document name"
                />
              </div>

              <SlugField
                value={slug}
                onChange={(next) => { setSlug(next); setSlugError(null); }}
                onUserEdit={() => setSlugAutoSync(false)}
                title={name}
                autoSync={slugAutoSync}
                onResetAutoSync={() => { setSlugAutoSync(true); setSlug(slugify(name)); setSlugError(null); }}
                routePrefix="/dashboard/documents/"
                error={slugError}
              />

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                  placeholder="Short description shown in the library"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Section</label>
                <select
                  value={section}
                  onChange={(e) => {
                    const next = e.target.value as DocumentSection;
                    setSection(next);
                    setSelectedCategoryIds((prev) =>
                      prev.filter((id) =>
                        categories.find((c) => c.id === id)?.section === next,
                      ),
                    );
                  }}
                  className={INPUT_CLASS}
                >
                  {SECTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">
                  Categories * ({availableCategories.length} available)
                </label>
                {availableCategories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic mt-1">
                    No categories in this section yet — create one in the Categories tab.
                  </p>
                ) : (
                  <div className="space-y-1.5 mt-1">
                    {availableCategories.map((c) => {
                      const checked = selectedCategoryIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                            checked
                              ? "border-navy-400 bg-navy-50/50"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleCategory(c.id)}
                            className="h-4 w-4 rounded border-slate-300 text-navy-600 focus:ring-navy-600"
                          />
                          <span className="text-sm text-slate-700">{c.title}</span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Source</label>
                <div className="flex gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => setSourceKind("upload")}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      sourceKind === "upload"
                        ? "border-navy-400 bg-navy-50/50 text-navy-700 font-semibold"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    File Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceKind("external")}
                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${
                      sourceKind === "external"
                        ? "border-navy-400 bg-navy-50/50 text-navy-700 font-semibold"
                        : "border-slate-200 text-slate-500"
                    }`}
                  >
                    External Link
                  </button>
                </div>

                {sourceKind === "upload" ? (
                  <div>
                    {uploadedName ? (
                      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
                        <span className="text-sm text-slate-700 truncate">{uploadedName}</span>
                        <button
                          type="button"
                          onClick={() => { setStorageKey(null); setUploadedName(null); }}
                          className="text-xs text-slate-400 hover:text-red-600"
                        >
                          Remove
                        </button>
                      </div>
                    ) : null}
                    <label
                      className={`mt-2 flex items-center justify-center gap-2 px-3 py-3 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-navy-400 hover:text-navy-600 cursor-pointer transition-colors ${
                        uploading ? "opacity-50 pointer-events-none" : ""
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg"
                        className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(f);
                          e.target.value = "";
                        }}
                      />
                      {uploading ? "Uploading…" : uploadedName ? "Replace file" : "Upload file (PDF, Word, Excel, image)"}
                    </label>
                  </div>
                ) : (
                  <input
                    type="url"
                    value={externalUrl}
                    onChange={(e) => setExternalUrl(e.target.value)}
                    placeholder="https://example.com/file.pdf"
                    className={INPUT_CLASS}
                  />
                )}
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={published}
                  onClick={() => setPublished(!published)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    published ? "bg-navy-600" : "bg-slate-200"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${published ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600">
                  {published ? "Published" : "Draft"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={quickAccess}
                  onClick={() => setQuickAccess(!quickAccess)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
                    quickAccess ? "bg-amber-500" : "bg-slate-200"
                  }`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${quickAccess ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600">
                  Featured in Quick Access
                </span>
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
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}
