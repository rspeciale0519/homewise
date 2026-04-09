"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TiptapEditor } from "@/components/admin/tiptap-editor";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { FileUploadZone, formatFileSize } from "@/components/admin/file-upload-zone";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import { extractYouTubeId, getYouTubeThumbnailUrl } from "@/lib/training/youtube";
import type { TrainingItem, UploadedFile } from "@/app/admin/training/types";

interface TrainingContentDrawerProps {
  open: boolean;
  onClose: () => void;
  item: TrainingItem | null;
  categories: string[];
  onSaved: () => void;
}

const FILE_LIMITS: Record<string, number> = {
  ".pdf": 25 * 1024 * 1024,
  ".xlsx": 10 * 1024 * 1024,
  ".xls": 10 * 1024 * 1024,
  ".docx": 10 * 1024 * 1024,
  ".doc": 10 * 1024 * 1024,
  ".png": 5 * 1024 * 1024,
  ".jpg": 5 * 1024 * 1024,
  ".jpeg": 5 * 1024 * 1024,
};

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf(".");
  return idx === -1 ? "" : name.slice(idx).toLowerCase();
}

const INPUT_CLASS = "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600";

export function TrainingContentDrawer({ open, onClose, item, categories, onSaved }: TrainingContentDrawerProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] ?? "");
  const [type, setType] = useState("video");
  const [audience, setAudience] = useState("agent");
  const [body, setBody] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [duration, setDuration] = useState("");
  const [tagsStr, setTagsStr] = useState("");
  const [published, setPublished] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [uploadingThumb, setUploadingThumb] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (item) {
      setTitle(item.title);
      setCategory(item.category);
      setType(item.type);
      setAudience(item.audience);
      setBody(item.body ?? "");
      setVideoUrl(item.url ?? "");
      setDuration(item.duration != null ? String(item.duration) : "");
      setTagsStr(item.tags.join(", "));
      setPublished(item.published);
      setUploadedFile(
        item.fileKey ? { name: item.fileKey.split("/").pop() ?? item.fileKey, size: 0, fileKey: item.fileKey } : null,
      );
      setThumbnailUrl(item.thumbnailUrl ?? null);
    } else {
      setTitle(""); setCategory(categories[0] ?? ""); setType("video");
      setAudience("agent"); setBody(""); setVideoUrl(""); setDuration("");
      setTagsStr(""); setPublished(false); setUploadedFile(null);
      setThumbnailUrl(null);
    }
  }, [open, item, categories]);

  const handleGeneratePdfThumbnail = useCallback(async (fileKey: string) => {
    try {
      const data = await adminFetch<{ thumbnailUrl: string }>(
        "/api/admin/training/generate-thumbnail",
        { method: "POST", body: JSON.stringify({ fileKey }) },
      );
      setThumbnailUrl(data.thumbnailUrl);
    } catch {
      // Silently fail — user can upload manually
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    const ext = getFileExtension(file.name);
    const limit = FILE_LIMITS[ext];
    if (!limit) { toast("File type not allowed", "error"); return; }
    if (file.size > limit) { toast(`File exceeds ${formatFileSize(limit)} limit`, "error"); return; }

    setUploading(true);
    try {
      const { uploadUrl, fileKey } = await adminFetch<{ uploadUrl: string; fileKey: string }>(
        "/api/admin/training/upload",
        { method: "POST", body: JSON.stringify({ filename: file.name, contentType: file.type }) },
      );
      await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      setUploadedFile({ name: file.name, size: file.size, fileKey });
      toast("File uploaded", "success");
    } catch (err) { toast((err as Error).message, "error"); }
    setUploading(false);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  const handleThumbnailUpload = useCallback(async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      toast("Use JPEG, PNG, or WebP for thumbnails", "error"); return;
    }
    if (file.size > 2 * 1024 * 1024) { toast("Thumbnail must be under 2MB", "error"); return; }
    setUploadingThumb(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/training/thumbnail", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setThumbnailUrl(data.thumbnailUrl);
      toast("Thumbnail uploaded", "success");
    } catch (err) { toast((err as Error).message, "error"); }
    setUploadingThumb(false);
  }, [toast]);

  // Auto-generate PDF thumbnail when a PDF is uploaded and no thumbnail exists
  useEffect(() => {
    if (uploadedFile?.fileKey?.endsWith(".pdf") && !thumbnailUrl) {
      handleGeneratePdfThumbnail(uploadedFile.fileKey);
    }
  }, [uploadedFile, thumbnailUrl, handleGeneratePdfThumbnail]);

  const handleSave = async () => {
    if (!title.trim()) { toast("Title is required", "error"); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(), category, type, audience,
        body: body || undefined, url: videoUrl || undefined,
        fileKey: uploadedFile?.fileKey ?? undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        duration: duration ? Number(duration) : undefined,
        tags: tagsStr.split(",").map((t) => t.trim()).filter(Boolean),
        published,
      };
      if (item) {
        await adminFetch(`/api/admin/training/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) });
        toast("Content updated", "success");
      } else {
        await adminFetch("/api/admin/training", { method: "POST", body: JSON.stringify(payload) });
        toast("Content created", "success");
      }
      onSaved();
      onClose();
    } catch (err) { toast((err as Error).message, "error"); }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await adminFetch(`/api/admin/training/${item.id}`, { method: "DELETE" });
      toast("Content deleted", "success");
      onSaved();
      onClose();
    } catch (err) { toast((err as Error).message, "error"); }
    setConfirmDelete(false);
  };

  const youtubeId = type === "video" && videoUrl ? extractYouTubeId(videoUrl) : null;

  return (
    <>
      <Dialog.Root open={open} onOpenChange={(v) => !v && onClose()}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 duration-300" />
          <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <Dialog.Title className="font-semibold text-navy-700 text-lg">
                {item ? `Edit: ${item.title}` : "New Training Content"}
              </Dialog.Title>
              <Dialog.Close asChild>
                <button className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" aria-label="Close">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </Dialog.Close>
            </div>

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className={INPUT_CLASS} placeholder="Content title" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={INPUT_CLASS}>
                  {categories.map((c) => <option key={c} value={c}>{c.replace("_", " ")}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>
                <select value={type} onChange={(e) => setType(e.target.value)} className={INPUT_CLASS}>
                  <option value="video">Video</option>
                  <option value="document">Document</option>
                  <option value="article">Article</option>
                  <option value="quiz">Quiz</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Audience</label>
                <select value={audience} onChange={(e) => setAudience(e.target.value)} className={INPUT_CLASS}>
                  <option value="agent">Agent Only</option>
                  <option value="public">Public</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Thumbnail — using img for dynamic external URLs in admin preview */}
              {/* eslint-disable @next/next/no-img-element */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Thumbnail</label>
                {thumbnailUrl ? (
                  <div className="relative group">
                    <img src={thumbnailUrl} alt="Thumbnail" className="w-full aspect-video object-cover rounded-lg border border-slate-200" />
                    <button
                      type="button"
                      onClick={() => setThumbnailUrl(null)}
                      className="absolute top-2 right-2 h-6 w-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ) : type === "video" && videoUrl && extractYouTubeId(videoUrl) ? (
                  <div>
                    <img src={getYouTubeThumbnailUrl(videoUrl) ?? ""} alt="YouTube thumbnail" className="w-full aspect-video object-cover rounded-lg border border-slate-200" />
                    <p className="text-xs text-slate-400 mt-1">Auto-detected from YouTube — upload custom to override</p>
                  </div>
                ) : null}
                <label className={`mt-2 flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-navy-400 hover:text-navy-600 cursor-pointer transition-colors ${uploadingThumb ? "opacity-50 pointer-events-none" : ""}`}>
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleThumbnailUpload(f); e.target.value = ""; }} />
                  {uploadingThumb ? "Uploading..." : thumbnailUrl ? "Replace thumbnail" : "Upload thumbnail (JPEG, PNG, WebP)"}
                </label>
              </div>
              {/* eslint-enable @next/next/no-img-element */}

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Body</label>
                <TiptapEditor key={item?.id ?? "new"} content={body} onChange={setBody} size="md" />
              </div>

              {type === "video" && (
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Video URL</label>
                  <input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} className={INPUT_CLASS} placeholder="https://www.youtube.com/watch?v=..." />
                  {youtubeId && (
                    <iframe src={`https://www.youtube.com/embed/${youtubeId}`} className="w-full aspect-video rounded-lg mt-2" allowFullScreen title="Video preview" />
                  )}
                </div>
              )}

              {(type === "document" || type === "article") && (
                <FileUploadZone
                  uploadedFile={uploadedFile}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  onDrop={handleDrop}
                  onFileSelect={handleFileUpload}
                  onRemove={() => setUploadedFile(null)}
                />
              )}

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Duration</label>
                <input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} className={INPUT_CLASS} placeholder="Duration (minutes)" min={0} />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Tags</label>
                <input value={tagsStr} onChange={(e) => setTagsStr(e.target.value)} className={INPUT_CLASS} placeholder="Tags (comma-separated)" />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button" role="switch" aria-checked={published}
                  onClick={() => setPublished(!published)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${published ? "bg-navy-600" : "bg-slate-200"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${published ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600">{published ? "Published" : "Draft"}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 flex items-center gap-2">
              <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
              {item && (
                <button onClick={() => setConfirmDelete(true)} className="ml-auto px-4 py-2 text-sm text-red-600 hover:text-red-700 font-semibold">Delete</button>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Content"
        message={`Are you sure you want to delete "${title}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
