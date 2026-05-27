"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { BLOCK_COMMANDS, filterBlockCommands } from "./block-menu-items";

interface BlockMenuProps {
  editor: Editor | null;
  open: boolean;
  query: string;
  /** Anchor in viewport-px (cursor position when slash was pressed). */
  anchor: { x: number; y: number } | null;
  onClose: () => void;
}

/**
 * Floating popover that lists insertable block types. Rendered by
 * `BlockEditor` when `/` is typed at the start of an empty paragraph.
 * Filtering is delegated to the pure `filterBlockCommands` helper.
 */
export function BlockMenu({
  editor,
  open,
  query,
  anchor,
  onClose,
}: BlockMenuProps) {
  const items = useMemo(() => filterBlockCommands(query), [query]);
  const [rawActiveIndex, setActiveIndex] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Filter changes shrink/grow the list; clamp the highlight inline rather
  // than mirroring it back into state from an effect.
  const activeIndex = items.length === 0 ? 0 : Math.min(rawActiveIndex, items.length - 1);

  // Capture arrow / Enter / Escape while the popover is open. Listening on
  // the window so the editor's own key handlers don't swallow the events.
  useEffect(() => {
    if (!open || !editor) return;
    function onKey(e: KeyboardEvent) {
      if (!items.length) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => {
          const next = items.length === 0 ? 0 : Math.min(i, items.length - 1);
          return (next + 1) % items.length;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => {
          const safe = items.length === 0 ? 0 : Math.min(i, items.length - 1);
          return (safe - 1 + items.length) % items.length;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        const choice = items[activeIndex];
        if (choice) {
          deleteSlashTrigger(editor!, query);
          choice.run(editor!);
          onClose();
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, editor, items, activeIndex, query, onClose]);

  if (!open || !anchor) return null;

  return (
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Insert block"
      className="fixed z-50 w-64 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1"
      style={{ left: anchor.x, top: anchor.y + 24 }}
    >
      {items.length === 0 ? (
        <p className="text-xs text-slate-400 px-3 py-2">
          No matches for &quot;{query}&quot;
        </p>
      ) : (
        items.map((cmd, i) => (
          <button
            key={cmd.id}
            role="option"
            aria-selected={i === activeIndex}
            type="button"
            onMouseDown={(e) => {
              // Use onMouseDown so the editor doesn't lose focus before run.
              e.preventDefault();
              if (!editor) return;
              deleteSlashTrigger(editor, query);
              cmd.run(editor);
              onClose();
            }}
            onMouseEnter={() => setActiveIndex(i)}
            className={cn(
              "w-full text-left px-3 py-2 text-sm flex flex-col gap-0.5 transition-colors",
              i === activeIndex
                ? "bg-crimson-50 text-navy-700"
                : "text-slate-700 hover:bg-slate-50",
            )}
          >
            <span className="font-medium">{cmd.label}</span>
            {cmd.hint && (
              <span className="text-xs text-slate-400">{cmd.hint}</span>
            )}
          </button>
        ))
      )}
    </div>
  );
}

/**
 * Remove the "/<query>" trigger text from the document before inserting
 * the chosen block. The slash menu treats the trigger as a transient
 * prompt that should never end up persisted to the document body.
 */
function deleteSlashTrigger(editor: Editor, query: string) {
  const { from } = editor.state.selection;
  const triggerLength = 1 + query.length;
  editor
    .chain()
    .focus()
    .deleteRange({ from: from - triggerLength, to: from })
    .run();
}

export { BLOCK_COMMANDS, filterBlockCommands };
