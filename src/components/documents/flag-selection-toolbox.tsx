"use client";

import { useEffect, useRef, useState } from "react";
import {
  FLAG_COLORS,
  FLAG_LABEL_PRESETS,
  MAX_CUSTOM_LABEL_LENGTH,
  flagColorHex,
  flagColorLabel,
} from "@/lib/documents/flag-colors";
import type { Annotation, FlagColor } from "@/types/document-viewer";
import { cn } from "@/lib/utils";

interface FlagSelectionToolboxProps {
  flag: Annotation;
  anchor: { left: number; top: number };
  onChangeColor: (color: FlagColor) => void;
  onChangeLabel: (label: string) => void;
  onDelete: () => void;
  onClose: () => void;
}

const PRESET_SET = new Set<string>(FLAG_LABEL_PRESETS);

export function FlagSelectionToolbox({
  flag,
  anchor,
  onChangeColor,
  onChangeLabel,
  onDelete,
  onClose,
}: FlagSelectionToolboxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState("");
  const [customError, setCustomError] = useState<string | null>(null);
  const [offset, setOffset] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 });

  const handleGripPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const startDx = offset.dx;
    const startDy = offset.dy;
    const onMove = (me: PointerEvent) => {
      setOffset({
        dx: startDx + (me.clientX - startX),
        dy: startDy + (me.clientY - startY),
      });
    };
    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const currentColor: FlagColor = isFlagColor(flag.color) ? flag.color : "yellow";
  const currentLabel = flag.value;
  const isPreset = PRESET_SET.has(currentLabel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const stopPropagation = (e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
  };

  const beginCustom = () => {
    setCustomDraft(isPreset ? "" : currentLabel);
    setCustomError(null);
    setCustomMode(true);
  };

  const commitCustom = () => {
    const trimmed = customDraft.trim();
    if (!trimmed) {
      setCustomError("Label required");
      return;
    }
    if (trimmed.length > MAX_CUSTOM_LABEL_LENGTH) {
      setCustomError(`Max ${MAX_CUSTOM_LABEL_LENGTH} chars`);
      return;
    }
    onChangeLabel(trimmed);
    setCustomMode(false);
  };

  return (
    <div
      ref={ref}
      onMouseDown={stopPropagation}
      onPointerDown={stopPropagation}
      className="absolute z-[60] bg-white border border-slate-100 rounded-xl shadow-dropdown p-2 flex items-center gap-2"
      style={{
        left: anchor.left + offset.dx,
        top: anchor.top + offset.dy,
        transform: "translateX(-50%)",
      }}
      role="toolbar"
      aria-label="Flag controls"
    >
      <button
        type="button"
        onPointerDown={handleGripPointerDown}
        title="Drag to move toolbar"
        aria-label="Drag toolbar"
        className="h-7 w-3 -ml-0.5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-grab active:cursor-grabbing"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 8 16" fill="currentColor" aria-hidden="true">
          <circle cx="2" cy="3" r="1" />
          <circle cx="6" cy="3" r="1" />
          <circle cx="2" cy="8" r="1" />
          <circle cx="6" cy="8" r="1" />
          <circle cx="2" cy="13" r="1" />
          <circle cx="6" cy="13" r="1" />
        </svg>
      </button>

      <div className="h-5 w-px bg-slate-200" />

      <div className="flex items-center gap-1" role="listbox" aria-label="Flag color">
        {FLAG_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="option"
            aria-selected={c === currentColor}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={(e) => {
              e.stopPropagation();
              onChangeColor(c);
            }}
            title={flagColorLabel(c)}
            className={cn(
              "h-5 w-5 rounded-full transition-transform hover:scale-110",
              c === currentColor
                ? "ring-2 ring-navy-600 ring-offset-1"
                : "ring-1 ring-slate-200"
            )}
            style={{ backgroundColor: flagColorHex(c) }}
          />
        ))}
      </div>

      <div className="h-5 w-px bg-slate-200" />

      {customMode ? (
        <div className="flex items-center gap-1">
          <input
            type="text"
            autoFocus
            maxLength={MAX_CUSTOM_LABEL_LENGTH}
            value={customDraft}
            onChange={(e) => {
              setCustomDraft(e.target.value);
              setCustomError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                commitCustom();
              } else if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setCustomMode(false);
              }
            }}
            onMouseDown={stopPropagation}
            placeholder="Label"
            aria-label="Custom flag label"
            aria-invalid={customError != null}
            className="h-7 w-24 px-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-md focus:outline-none focus:border-navy-600"
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
            }}
            onClick={commitCustom}
            className="h-7 px-2 text-xs font-semibold text-navy-700 hover:bg-slate-50 rounded-md transition-colors"
          >
            Save
          </button>
          {customError && (
            <span className="text-[10px] text-crimson-600">{customError}</span>
          )}
        </div>
      ) : (
        <select
          value={isPreset ? currentLabel : "__custom__"}
          onMouseDown={stopPropagation}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "__custom__") {
              beginCustom();
            } else {
              onChangeLabel(v);
            }
          }}
          aria-label="Flag label"
          className="h-7 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-navy-600"
        >
          {FLAG_LABEL_PRESETS.map((preset) => (
            <option key={preset} value={preset}>
              {preset}
            </option>
          ))}
          <option value="__custom__">
            {isPreset ? "Custom…" : `Custom: ${currentLabel}`}
          </option>
        </select>
      )}

      <div className="h-5 w-px bg-slate-200" />

      <button
        type="button"
        onMouseDown={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete flag"
        aria-label="Delete flag"
        className="h-7 w-7 flex items-center justify-center rounded-md text-slate-500 hover:text-crimson-600 hover:bg-crimson-50 transition-colors"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
        </svg>
      </button>
    </div>
  );
}

function isFlagColor(value: string): value is FlagColor {
  return ["yellow", "blue", "green", "red", "purple", "orange"].includes(value);
}
