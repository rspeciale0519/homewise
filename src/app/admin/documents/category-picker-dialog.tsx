"use client";

import { useMemo, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { ChevronLeft, FolderInput } from "lucide-react";
import { cn } from "@/lib/utils";
import type {
  AdminCategoryTree,
  DocumentSection,
} from "./types";

const STORAGE_KEY = "homewise.organize.lastCategory";

type LastUsedMap = Partial<Record<DocumentSection, string>>;

const SECTION_LABELS: Record<DocumentSection, string> = {
  office: "Office",
  listing: "Listing",
  sales: "Sales",
};

function readLastUsedMap(): LastUsedMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as LastUsedMap;
    }
    return {};
  } catch {
    return {};
  }
}

function writeLastUsed(section: DocumentSection, categoryId: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = readLastUsedMap();
    map[section] = categoryId;
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // quota / privacy mode — silently ignore
  }
}

function pickInitialCategory(
  section: DocumentSection | undefined,
  sectionsToCategories: Record<DocumentSection, AdminCategoryTree[]>,
): string | undefined {
  if (!section) return undefined;
  const remembered = readLastUsedMap()[section];
  if (!remembered) return undefined;
  const stillExists = sectionsToCategories[section]?.some(
    (c) => c.id === remembered,
  );
  return stillExists ? remembered : undefined;
}

export interface CategoryPickerDialogProps {
  open: boolean;
  documentCount: number;
  sectionsToCategories: Record<DocumentSection, AdminCategoryTree[]>;
  /** When set, dialog skips the section step. When undefined, user picks section first. */
  section?: DocumentSection;
  onCancel: () => void;
  onConfirm: (args: {
    section: DocumentSection;
    categoryId: string;
    categoryTitle: string;
  }) => void;
}

export function CategoryPickerDialog({
  open,
  documentCount,
  sectionsToCategories,
  section,
  onCancel,
  onConfirm,
}: CategoryPickerDialogProps) {
  const [currentStep, setCurrentStep] = useState<"section" | "category">(() =>
    section ? "category" : "section",
  );
  const [pickedSection, setPickedSection] = useState<
    DocumentSection | undefined
  >(() => section);
  const [pickedCategoryId, setPickedCategoryId] = useState<string | undefined>(
    () => pickInitialCategory(section, sectionsToCategories),
  );

  const visibleCategories = useMemo<AdminCategoryTree[]>(() => {
    if (!pickedSection) return [];
    return sectionsToCategories[pickedSection] ?? [];
  }, [pickedSection, sectionsToCategories]);

  function handleSectionPick(sec: DocumentSection) {
    setPickedSection(sec);
    setPickedCategoryId(pickInitialCategory(sec, sectionsToCategories));
    setCurrentStep("category");
  }

  function handleBack() {
    if (section) return; // drag path locks the section
    setCurrentStep("section");
    setPickedCategoryId(undefined);
  }

  function handleConfirm() {
    if (!pickedSection || !pickedCategoryId) return;
    const cat = visibleCategories.find((c) => c.id === pickedCategoryId);
    if (!cat) return;
    writeLastUsed(pickedSection, pickedCategoryId);
    onConfirm({
      section: pickedSection,
      categoryId: pickedCategoryId,
      categoryTitle: cat.title,
    });
  }

  const titleSuffix =
    pickedSection && currentStep === "category"
      ? ` to ${SECTION_LABELS[pickedSection]}`
      : "";
  const docLabel =
    documentCount === 1 ? "1 document" : `${documentCount} documents`;
  const confirmLabel =
    documentCount === 1 ? "Assign" : `Assign ${documentCount}`;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onCancel();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 bg-black/40 z-[100]" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(100vw-1.5rem,28rem)] max-h-[85vh] overflow-y-auto bg-white rounded-2xl shadow-2xl p-5 z-[101] focus:outline-none">
          <AlertDialog.Title className="text-lg font-serif font-semibold text-navy-700">
            Move {docLabel}
            {titleSuffix}
          </AlertDialog.Title>
          <AlertDialog.Description className="text-sm text-slate-500 mt-1">
            {currentStep === "section"
              ? "Step 1 of 2 — pick a section"
              : "Pick a category"}
          </AlertDialog.Description>

          {currentStep === "section" ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {(Object.keys(SECTION_LABELS) as DocumentSection[]).map((sec) => {
                const count = sectionsToCategories[sec]?.length ?? 0;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSectionPick(sec)}
                    disabled={count === 0}
                    className="flex flex-col items-center justify-center gap-1 px-4 py-4 border border-slate-200 rounded-xl hover:border-crimson-400 hover:bg-crimson-50/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FolderInput className="h-5 w-5 text-crimson-600" />
                    <span className="text-sm font-semibold text-navy-700">
                      {SECTION_LABELS[sec]}
                    </span>
                    <span className="text-xs text-slate-400">
                      {count} {count === 1 ? "category" : "categories"}
                    </span>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-4">
              {visibleCategories.length === 0 ? (
                <p className="text-sm text-slate-500 py-6 text-center">
                  No categories in this section yet. Add one from the toolbar
                  first.
                </p>
              ) : (
                <ul
                  role="radiogroup"
                  aria-label="Categories"
                  className="max-h-72 overflow-y-auto border border-slate-100 rounded-lg divide-y divide-slate-100"
                >
                  {visibleCategories.map((cat) => {
                    const isPicked = pickedCategoryId === cat.id;
                    return (
                      <li key={cat.id}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isPicked}
                          onClick={() => setPickedCategoryId(cat.id)}
                          className={cn(
                            "w-full flex items-center justify-between gap-3 px-3 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-crimson-600",
                            isPicked
                              ? "bg-crimson-50"
                              : "hover:bg-slate-50",
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-navy-700 truncate">
                              {cat.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate">
                              {cat.documents.length}{" "}
                              {cat.documents.length === 1 ? "doc" : "docs"}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "h-4 w-4 rounded-full border-2 shrink-0",
                              isPicked
                                ? "border-crimson-600 bg-crimson-600"
                                : "border-slate-300 bg-white",
                            )}
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-5 items-center">
            {currentStep === "category" && !section && (
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-slate-600 hover:text-navy-700 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600"
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {currentStep === "category" && (
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!pickedCategoryId}
                className="ml-auto px-4 py-2 bg-crimson-600 text-white rounded-lg text-sm font-semibold hover:bg-crimson-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-crimson-600 focus-visible:ring-offset-1"
              >
                {confirmLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onCancel}
              className={cn(
                "px-3 py-2 text-sm font-semibold text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-600",
                currentStep === "section" && "ml-auto",
              )}
            >
              Cancel
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
