"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { AnnotationFontFamily } from "@/types/document-viewer";
import {
  ANNOTATION_FONT_FAMILIES,
  FONT_SIZE_PRESETS,
  MAX_FONT_SIZE,
  MIN_FONT_SIZE,
  clampFontSize,
  fontFamilyCss,
  fontFamilyLabel,
} from "@/lib/documents/fonts";

interface AnnotationToolboxProps {
  fontFamily: AnnotationFontFamily;
  fontSize: number;
  anchor: { left: number; top: number };
  targetWidth: number;
  onChange(next: { fontFamily?: AnnotationFontFamily; fontSize?: number }): void;
  onClose?: () => void;
}

const TOOLBOX_WIDTH = 240;
const TOOLBOX_HEIGHT = 44;
const TOOLBOX_MARGIN = 8;
const FLIPPED_OFFSET = 24;

export function AnnotationToolbox({
  fontFamily,
  fontSize,
  anchor,
  targetWidth,
  onChange,
  onClose,
}: AnnotationToolboxProps) {
  const left = Math.max(4, anchor.left + targetWidth / 2 - TOOLBOX_WIDTH / 2);
  const wantedTop = anchor.top - TOOLBOX_HEIGHT - TOOLBOX_MARGIN;
  const top = wantedTop < 4 ? anchor.top + FLIPPED_OFFSET : wantedTop;

  useEffect(() => {
    if (!onClose) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="absolute z-50 flex items-center gap-1 bg-white rounded-xl shadow-dropdown border border-slate-100 p-1.5"
      style={{ left, top, width: TOOLBOX_WIDTH, height: TOOLBOX_HEIGHT }}
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <FontDropdown
        family={fontFamily}
        onSelect={(family) => onChange({ fontFamily: family })}
      />
      <div className="h-5 w-px bg-slate-100" aria-hidden="true" />
      <SizeCombo
        size={fontSize}
        onSet={(size) => onChange({ fontSize: size })}
      />
    </div>
  );
}

function FontDropdown({
  family,
  onSelect,
}: {
  family: AnnotationFontFamily;
  onSelect: (next: AnnotationFontFamily) => void;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, ANNOTATION_FONT_FAMILIES.indexOf(family))
  );
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !buttonRef.current?.contains(t) &&
        !listRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      setActiveIndex(Math.max(0, ANNOTATION_FONT_FAMILIES.indexOf(family)));
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, ANNOTATION_FONT_FAMILIES.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const next = ANNOTATION_FONT_FAMILIES[activeIndex];
      if (next) {
        onSelect(next);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className="relative flex-1 min-w-0">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label="Font family"
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onClick={() => {
          setActiveIndex(Math.max(0, ANNOTATION_FONT_FAMILIES.indexOf(family)));
          setOpen((o) => !o);
        }}
        onKeyDown={handleKeyDown}
        className="w-full h-8 px-2.5 flex items-center justify-between gap-2 rounded-lg text-sm text-navy-700 hover:bg-slate-50 transition-colors"
      >
        <span
          className="truncate text-left"
          style={{ fontFamily: fontFamilyCss(family) }}
        >
          {fontFamilyLabel(family)}
        </span>
        <Caret className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Font family"
          className="absolute z-10 left-0 right-0 top-full mt-1 bg-white rounded-lg shadow-dropdown border border-slate-100 py-1 max-h-60 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {ANNOTATION_FONT_FAMILIES.map((f, i) => {
            const selected = f === family;
            const active = i === activeIndex;
            return (
              <li
                key={f}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => {
                  onSelect(f);
                  setOpen(false);
                }}
                className={
                  "px-3 py-1.5 text-sm cursor-pointer transition-colors " +
                  (selected
                    ? "bg-navy-50 text-navy-700"
                    : active
                      ? "bg-slate-50 text-navy-700"
                      : "text-slate-700 hover:bg-slate-50")
                }
                style={{ fontFamily: fontFamilyCss(f) }}
              >
                {fontFamilyLabel(f)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function SizeCombo({
  size,
  onSet,
}: {
  size: number;
  onSet: (next: number) => void;
}) {
  const [draft, setDraft] = useState(String(size));
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    setDraft(String(size));
  }, [size]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      const t = e.target as Node;
      if (
        !popoverRef.current?.contains(t) &&
        !triggerRef.current?.contains(t)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    if (!Number.isFinite(parsed)) {
      setDraft(String(size));
      return;
    }
    const clamped = clampFontSize(parsed);
    setDraft(String(clamped));
    if (clamped !== size) onSet(clamped);
  };

  return (
    <div className="relative flex items-center w-[76px] h-8 px-1.5 rounded-lg bg-slate-50/60 border border-transparent focus-within:border-navy-200 focus-within:bg-white transition-colors">
      <input
        ref={inputRef}
        type="number"
        inputMode="numeric"
        min={MIN_FONT_SIZE}
        max={MAX_FONT_SIZE}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
            inputRef.current?.blur();
          }
        }}
        onBlur={() => commit(draft)}
        onMouseDown={(e) => e.stopPropagation()}
        aria-label="Font size"
        className="w-full bg-transparent text-sm text-navy-700 text-center outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        ref={triggerRef}
        type="button"
        onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Font size presets"
        className="h-5 w-5 ml-0.5 flex items-center justify-center rounded text-slate-400 hover:text-navy-700 hover:bg-slate-100 transition-colors"
      >
        <Caret small className={open ? "rotate-180" : ""} />
      </button>

      {open && (
        <ul
          ref={popoverRef}
          role="listbox"
          aria-label="Font size"
          className="absolute z-10 right-0 top-full mt-1 w-20 bg-white rounded-lg shadow-dropdown border border-slate-100 py-1 max-h-60 overflow-auto"
          onMouseDown={(e) => e.preventDefault()}
        >
          {FONT_SIZE_PRESETS.map((preset) => {
            const selected = preset === size;
            return (
              <li
                key={preset}
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (preset !== size) onSet(preset);
                  setDraft(String(preset));
                  setOpen(false);
                }}
                className={
                  "px-3 py-1.5 text-sm text-center cursor-pointer transition-colors " +
                  (selected
                    ? "bg-navy-50 text-navy-700"
                    : "text-slate-700 hover:bg-slate-50")
                }
              >
                {preset}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function Caret({ className, small }: { className?: string; small?: boolean }) {
  return (
    <svg
      className={
        (small ? "h-3 w-3 " : "h-3.5 w-3.5 ") +
        "text-slate-400 transition-transform " +
        (className ?? "")
      }
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
    </svg>
  );
}
