"use client";

import { useCallback, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Plus, Trash2, X } from "lucide-react";
import type { CourseSectionData, TrainingItem } from "@/app/admin/training/types";

/** Local draft of a section while the curriculum builder is open. */
export interface SectionDraft {
  /** Existing section id, or `null` for sections created in the current
   * editing session (PUT /curriculum will create them). */
  id: string | null;
  title: string;
  dripDays: number | null;
  contentIds: string[];
  /** Stable local key used for React reconciliation regardless of
   * whether `id` exists yet. */
  tempKey: string;
}

interface CurriculumBuilderProps {
  initialSections: CourseSectionData[];
  allContent: TrainingItem[];
  onChange: (sections: SectionDraft[]) => void;
}

export function CourseCurriculumBuilder({
  initialSections,
  allContent,
  onChange,
}: CurriculumBuilderProps) {
  const [drafts, setDrafts] = useState<SectionDraft[]>(() =>
    initialSections.map((s) => ({
      id: s.id,
      title: s.title,
      dripDays: s.dripDays,
      contentIds: s.items.map((i) => i.contentId),
      tempKey: s.id,
    })),
  );

  const update = useCallback(
    (next: SectionDraft[]) => {
      setDrafts(next);
      onChange(next);
    },
    [onChange],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = drafts.findIndex((s) => s.tempKey === active.id);
    const toIdx = drafts.findIndex((s) => s.tempKey === over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    update(arrayMove(drafts, fromIdx, toIdx));
  }

  function addSection() {
    const next: SectionDraft = {
      id: null,
      title: `Section ${drafts.length + 1}`,
      dripDays: null,
      contentIds: [],
      tempKey: `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    update([...drafts, next]);
  }

  function renameSection(tempKey: string, title: string) {
    update(drafts.map((s) => (s.tempKey === tempKey ? { ...s, title } : s)));
  }

  function deleteSection(tempKey: string) {
    update(drafts.filter((s) => s.tempKey !== tempKey));
  }

  function setSectionContent(tempKey: string, contentIds: string[]) {
    update(
      drafts.map((s) => (s.tempKey === tempKey ? { ...s, contentIds } : s)),
    );
  }

  return (
    <div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onSectionDragEnd}
      >
        <SortableContext
          items={drafts.map((s) => s.tempKey)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-3">
            {drafts.map((section) => (
              <SectionCard
                key={section.tempKey}
                section={section}
                allContent={allContent}
                onRename={(title) => renameSection(section.tempKey, title)}
                onDelete={() => deleteSection(section.tempKey)}
                onSetContent={(ids) => setSectionContent(section.tempKey, ids)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <button
        type="button"
        onClick={addSection}
        className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 text-xs font-semibold text-navy-700 border-2 border-dashed border-slate-200 rounded-lg hover:border-navy-300 hover:bg-slate-50 transition-colors w-full justify-center"
      >
        <Plus className="h-3.5 w-3.5" />
        Add section
      </button>
    </div>
  );
}

interface SectionCardProps {
  section: SectionDraft;
  allContent: TrainingItem[];
  onRename: (next: string) => void;
  onDelete: () => void;
  onSetContent: (contentIds: string[]) => void;
}

function SectionCard({
  section,
  allContent,
  onRename,
  onDelete,
  onSetContent,
}: SectionCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.tempKey });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const [pickerOpen, setPickerOpen] = useState(false);

  const items = section.contentIds.map((id) => {
    const match = allContent.find((c) => c.id === id);
    return { id, title: match?.title ?? id, type: match?.type ?? "video" };
  });

  function moveItem(fromIdx: number, toIdx: number) {
    onSetContent(arrayMove(section.contentIds, fromIdx, toIdx));
  }
  function removeItem(id: string) {
    onSetContent(section.contentIds.filter((c) => c !== id));
  }
  function addItem(id: string) {
    if (section.contentIds.includes(id)) return;
    onSetContent([...section.contentIds, id]);
    setPickerOpen(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-slate-50/60 border border-slate-200 rounded-xl p-3"
    >
      <div className="flex items-center gap-2 mb-3">
        <button
          type="button"
          aria-label="Drag section"
          {...attributes}
          {...listeners}
          className="h-7 w-5 inline-flex items-center justify-center text-slate-300 hover:text-navy-500 cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <input
          value={section.title}
          onChange={(e) => onRename(e.target.value)}
          className="flex-1 h-8 px-2 text-sm font-semibold bg-transparent border border-transparent hover:border-slate-200 focus:border-navy-400 rounded focus:outline-none"
          placeholder="Section title"
        />
        <span className="text-[10px] text-slate-400 font-medium bg-white border border-slate-200 px-1.5 py-0.5 rounded-full">
          {section.contentIds.length}
        </span>
        <button
          type="button"
          aria-label="Delete section"
          onClick={onDelete}
          className="h-7 w-7 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded-md"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <SectionItemList
        sectionId={section.tempKey}
        items={items}
        onReorder={moveItem}
        onRemove={removeItem}
      />

      <div className="mt-2 relative">
        <button
          type="button"
          onClick={() => setPickerOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 text-xs font-semibold text-navy-700 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add from library
        </button>
        {pickerOpen && (
          <LibraryPicker
            allContent={allContent}
            excludeIds={section.contentIds}
            onPick={addItem}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </div>
  );
}

interface SectionItemListProps {
  sectionId: string;
  items: { id: string; title: string; type: string }[];
  onReorder: (fromIdx: number, toIdx: number) => void;
  onRemove: (id: string) => void;
}

function SectionItemList({
  sectionId,
  items,
  onReorder,
  onRemove,
}: SectionItemListProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIdx = items.findIndex((i) => i.id === active.id);
    const toIdx = items.findIndex((i) => i.id === over.id);
    if (fromIdx === -1 || toIdx === -1) return;
    onReorder(fromIdx, toIdx);
  }

  if (items.length === 0) {
    return (
      <p className="text-xs text-slate-400 px-2 py-3 text-center bg-white rounded-lg border border-dashed border-slate-200">
        No items in this section yet
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      id={`section-items-${sectionId}`}
    >
      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul className="space-y-1.5">
          {items.map((i) => (
            <SortableSectionItem
              key={i.id}
              id={i.id}
              title={i.title}
              type={i.type}
              onRemove={() => onRemove(i.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableSectionItemProps {
  id: string;
  title: string;
  type: string;
  onRemove: () => void;
}

function SortableSectionItem({
  id,
  title,
  type,
  onRemove,
}: SortableSectionItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <li
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2 py-1.5"
    >
      <button
        type="button"
        aria-label="Drag item"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 touch-none"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <span className="flex-1 text-xs text-navy-700 truncate">{title}</span>
      <span className="text-[10px] font-medium text-slate-400 capitalize">{type}</span>
      <button
        type="button"
        aria-label="Remove item"
        onClick={onRemove}
        className="h-6 w-6 inline-flex items-center justify-center text-slate-400 hover:text-crimson-600 hover:bg-crimson-50 rounded"
      >
        <X className="h-3 w-3" />
      </button>
    </li>
  );
}

interface LibraryPickerProps {
  allContent: TrainingItem[];
  excludeIds: string[];
  onPick: (contentId: string) => void;
  onClose: () => void;
}

function LibraryPicker({
  allContent,
  excludeIds,
  onPick,
  onClose,
}: LibraryPickerProps) {
  const [q, setQ] = useState("");
  const excludeSet = new Set(excludeIds);
  const candidates = allContent
    .filter((c) => !excludeSet.has(c.id))
    .filter((c) =>
      q.trim()
        ? c.title.toLowerCase().includes(q.trim().toLowerCase())
        : true,
    )
    .slice(0, 50);
  return (
    <div
      role="dialog"
      aria-label="Pick content to add"
      className="absolute left-0 top-9 z-30 w-80 bg-white border border-slate-200 rounded-lg shadow-xl"
    >
      <div className="flex items-center gap-2 p-2 border-b border-slate-100">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search library…"
          className="flex-1 h-8 px-2 text-xs border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-navy-600"
          autoFocus
        />
        <button
          type="button"
          aria-label="Close picker"
          onClick={onClose}
          className="h-7 w-7 inline-flex items-center justify-center rounded text-slate-400 hover:bg-slate-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <ul className="max-h-60 overflow-y-auto py-1">
        {candidates.length === 0 ? (
          <li className="px-3 py-3 text-xs text-slate-400 text-center">
            No content matches
          </li>
        ) : (
          candidates.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onPick(c.id)}
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50 flex items-center justify-between gap-2"
              >
                <span className="text-navy-700 truncate">{c.title}</span>
                <span className="text-[10px] font-medium text-slate-400 capitalize">
                  {c.type}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
