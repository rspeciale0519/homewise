"use client";

import { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  CourseCurriculumBuilder,
  type SectionDraft,
} from "@/components/admin/course-curriculum-builder";
import { useToast } from "@/components/admin/admin-toast";
import { adminFetch } from "@/lib/admin-fetch";
import type { TrainingItem, CourseData } from "@/app/admin/training/types";

interface TrainingCourseDrawerProps {
  open: boolean;
  onClose: () => void;
  course: CourseData | null;
  allContent: TrainingItem[];
  onSaved: () => void;
}

const INPUT_CLASS =
  "w-full h-10 px-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600";

export function TrainingCourseDrawer({
  open,
  onClose,
  course,
  allContent,
  onSaved,
}: TrainingCourseDrawerProps) {
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [required, setRequired] = useState(false);
  const [autoEnroll, setAutoEnroll] = useState(false);
  const [reminderDays, setReminderDays] = useState("");
  const [reminderRepeat, setReminderRepeat] = useState("");
  const [sectionDrafts, setSectionDrafts] = useState<SectionDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect -- sync form state from props */
  useEffect(() => {
    if (!open) return;
    if (course) {
      setName(course.name);
      setDescription(course.description ?? "");
      setRequired(course.required);
      setAutoEnroll(course.autoEnroll);
      setReminderDays(course.reminderDays != null ? String(course.reminderDays) : "");
      setReminderRepeat(course.reminderRepeat != null ? String(course.reminderRepeat) : "");
    } else {
      setName("");
      setDescription("");
      setRequired(false);
      setAutoEnroll(false);
      setReminderDays("");
      setReminderRepeat("");
      setSectionDrafts([]);
    }
  }, [open, course]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Name is required", "error");
      return;
    }
    setSaving(true);
    try {
      const coursePayload = {
        name: name.trim(),
        description: description.trim() || undefined,
        required,
        autoEnroll,
        reminderDays: reminderDays ? Number(reminderDays) : undefined,
        reminderRepeat: reminderRepeat ? Number(reminderRepeat) : undefined,
      };
      let courseId: string;
      if (course) {
        await adminFetch(`/api/admin/training/tracks/${course.id}`, {
          method: "PATCH",
          body: JSON.stringify(coursePayload),
        });
        courseId = course.id;
      } else {
        const created = await adminFetch<{ id: string }>(
          "/api/admin/training/tracks",
          {
            method: "POST",
            body: JSON.stringify(coursePayload),
          },
        );
        courseId = created.id;
      }

      await adminFetch(
        `/api/admin/training/tracks/${courseId}/curriculum`,
        {
          method: "PUT",
          body: JSON.stringify({
            sections: sectionDrafts.map((s) => ({
              id: s.id ?? undefined,
              title: s.title,
              dripDays: s.dripDays,
              contentIds: s.contentIds,
            })),
          }),
        },
      );

      toast(course ? "Course updated" : "Course created", "success");
      onSaved();
      onClose();
    } catch (err) {
      toast((err as Error).message, "error");
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!course) return;
    try {
      await adminFetch(`/api/admin/training/tracks/${course.id}`, {
        method: "DELETE",
      });
      toast("Course deleted", "success");
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
                {course ? `Edit: ${course.name}` : "New Learning Course"}
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
                <input value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} placeholder="Course name" />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 mb-1 block">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 resize-none"
                  placeholder="Brief description of the learning course"
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

              {/* Curriculum */}
              <div>
                <label className="text-xs font-medium text-slate-500 mb-2 block">
                  Curriculum
                </label>
                <CourseCurriculumBuilder
                  key={course?.id ?? "new"}
                  initialSections={course?.sections ?? []}
                  allContent={allContent}
                  onChange={setSectionDrafts}
                />
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
              {course && (
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
        title="Delete Course"
        message={`Are you sure you want to delete "${name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
}
