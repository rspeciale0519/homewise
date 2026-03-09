"use client";

import { useState, useEffect, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import type { TrainingItem, TrackData } from "@/app/admin/training/types";

interface TrainingTrackDrawerProps {
  open: boolean;
  onClose: () => void;
  track: TrackData | null;
  allContent: TrainingItem[];
  onSaved: () => void;
}

interface TrackContentItem {
  id: string;
  title: string;
  type: string;
}

const INPUT_CLASS =
  "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600";

const TYPE_BADGE_COLORS: Record<string, string> = {
  video: "bg-crimson-100 text-crimson-700",
  document: "bg-blue-100 text-blue-700",
  article: "bg-navy-100 text-navy-700",
  quiz: "bg-navy-100 text-navy-700",
};

function SortableTrackItem({
  item,
  onRemove,
}: {
  item: TrackContentItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const badgeColor = TYPE_BADGE_COLORS[item.type] ?? "bg-slate-100 text-slate-600";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
    >
      <button
        type="button"
        className="cursor-grab text-slate-400 hover:text-slate-600 touch-none"
        {...attributes}
        {...listeners}
      >
        <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="5" cy="3" r="1.5" />
          <circle cx="11" cy="3" r="1.5" />
          <circle cx="5" cy="8" r="1.5" />
          <circle cx="11" cy="8" r="1.5" />
          <circle cx="5" cy="13" r="1.5" />
          <circle cx="11" cy="13" r="1.5" />
        </svg>
      </button>
      <span className="text-sm text-navy-700 flex-1 truncate">{item.title}</span>
      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize ${badgeColor}`}>
        {item.type}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="h-6 w-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function TrainingTrackDrawer({
  open,
  onClose,
  track,
  allContent,
  onSaved,
}: TrainingTrackDrawerProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [autoEnroll, setAutoEnroll] = useState(false);
  const [reminderDays, setReminderDays] = useState("");
  const [reminderRepeat, setReminderRepeat] = useState("");
  const [items, setItems] = useState<TrackContentItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor),
  );

  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from props */
  useEffect(() => {
    if (!open) return;
    if (track) {
      setName(track.name);
      setDescription(track.description ?? "");
      setRequired(track.required);
      setAutoEnroll(track.autoEnroll);
      setReminderDays(track.reminderDays != null ? String(track.reminderDays) : "");
      setReminderRepeat(track.reminderRepeat != null ? String(track.reminderRepeat) : "");
      setItems(
        track.items.map((ti) => ({
          id: ti.content.id,
          title: ti.content.title,
          type: ti.content.type,
        })),
      );
    } else {
      setName("");
      setDescription("");
      setRequired(false);
      setAutoEnroll(false);
      setReminderDays("");
      setReminderRepeat("");
      setItems([]);
    }
    setPickerOpen(false);
    setPickerSearch("");
  }, [open, track]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const itemIds = useMemo(() => new Set(items.map((i) => i.id)), [items]);

  const availableContent = useMemo(() => {
    const published = allContent.filter((c) => c.published && !itemIds.has(c.id));
    if (!pickerSearch.trim()) return published;
    const q = pickerSearch.toLowerCase();
    return published.filter((c) => c.title.toLowerCase().includes(q));
  }, [allContent, itemIds, pickerSearch]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setItems((prev) => {
        const oldIndex = prev.findIndex((i) => i.id === active.id);
        const newIndex = prev.findIndex((i) => i.id === over.id);
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const addItem = (content: TrainingItem) => {
    setItems((prev) => [...prev, { id: content.id, title: content.title, type: content.type }]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        required,
        autoEnroll,
        reminderDays: reminderDays ? Number(reminderDays) : undefined,
        reminderRepeat: reminderRepeat ? Number(reminderRepeat) : undefined,
        contentIds: items.map((i) => i.id),
      };
      if (track) {
        await adminFetch(`/api/admin/training/tracks/${track.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        toast("Track updated", "success");
      } else {
        await adminFetch("/api/admin/training/tracks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        toast("Track created", "success");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!track) return;
    try {
      await adminFetch(`/api/admin/training/tracks/${track.id}`, { method: "DELETE" });
      toast("Track deleted", "success");
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
          <Dialog.Content className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-lg bg-white shadow-2xl flex flex-col outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <Dialog.Title className="font-semibold text-navy-700 text-lg">
                {track ? `Edit: ${track.name}` : "New Learning Track"}
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

            {/* Scrollable form body */}
            <div className="overflow-y-auto flex-1 p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="Track name" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none"
                  placeholder="Brief description of the learning track"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={required}
                  onClick={() => {
                    const next = !required;
                    setRequired(next);
                    if (!next) {
                      setReminderDays("");
                      setReminderRepeat("");
                    }
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${required ? "bg-navy-600" : "bg-slate-200"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${required ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600">Required</span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoEnroll}
                  onClick={() => setAutoEnroll(!autoEnroll)}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${autoEnroll ? "bg-navy-600" : "bg-slate-200"}`}
                >
                  <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${autoEnroll ? "translate-x-5" : "translate-x-0"}`} />
                </button>
                <span className="text-sm text-slate-600">Auto-enroll</span>
              </div>

              {required && (
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Send reminder after (days)</label>
                  <input
                    type="number"
                    value={reminderDays}
                    onChange={(e) => {
                      setReminderDays(e.target.value);
                      if (!e.target.value) setReminderRepeat("");
                    }}
                    className={INPUT_CLASS}
                    placeholder="e.g. 7"
                    min={1}
                  />
                </div>
              )}

              {required && reminderDays && (
                <div>
                  <label className="text-xs font-medium text-slate-500 mb-1 block">Repeat every (days)</label>
                  <input
                    type="number"
                    value={reminderRepeat}
                    onChange={(e) => setReminderRepeat(e.target.value)}
                    className={INPUT_CLASS}
                    placeholder="e.g. 3"
                    min={1}
                  />
                </div>
              )}

              {/* Content Items */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">
                  Content Items ({items.length})
                </label>
                {items.length > 0 ? (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                      <div className="space-y-1.5">
                        {items.map((item) => (
                          <SortableTrackItem key={item.id} item={item} onRemove={() => removeItem(item.id)} />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                ) : (
                  <p className="text-xs text-slate-400 py-3 text-center border border-dashed border-slate-200 rounded-lg">
                    No content items added yet
                  </p>
                )}

                {/* Add content button / picker */}
                <div className="mt-2 relative">
                  <button
                    type="button"
                    onClick={() => setPickerOpen(!pickerOpen)}
                    className="text-sm text-navy-600 hover:text-navy-700 font-semibold"
                  >
                    + Add Content
                  </button>
                  {pickerOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-60 flex flex-col">
                      <div className="p-2 border-b border-slate-100">
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Search content..."
                          className="w-full h-8 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-navy-600"
                          autoFocus
                        />
                      </div>
                      <div className="overflow-y-auto flex-1">
                        {availableContent.length > 0 ? (
                          availableContent.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                addItem(c);
                                setPickerSearch("");
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2"
                            >
                              <span className="text-navy-700 truncate flex-1">{c.title}</span>
                              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${TYPE_BADGE_COLORS[c.type] ?? "bg-slate-100 text-slate-600"}`}>
                                {c.type}
                              </span>
                            </button>
                          ))
                        ) : (
                          <p className="text-xs text-slate-400 p-3 text-center">No available content</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-4 flex items-center gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-navy-600 text-white rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700">
                Cancel
              </button>
              {track && (
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
        title="Delete Track"
        message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
