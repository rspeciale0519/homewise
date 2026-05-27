import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import Youtube from "@tiptap/extension-youtube";
import type { Editor } from "@tiptap/react";

interface BuildExtensionsArgs {
  placeholder?: string;
}

/**
 * Tiptap extension set for the Training Hub v1 block editor. Built on
 * StarterKit (headings, lists, blockquote, code-block, hr, formatting,
 * history) and layered with link, image, task-list, YouTube embed, and a
 * lightweight placeholder hint.
 *
 * Returns an array — callers spread it into `useEditor({ extensions })`.
 */
export function buildExtensions({ placeholder }: BuildExtensionsArgs = {}) {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "tt-link", rel: "noopener noreferrer" },
    }),
    Image.configure({
      HTMLAttributes: { class: "tt-image" },
    }),
    TaskList.configure({
      HTMLAttributes: { class: "tt-task-list" },
    }),
    TaskItem.configure({
      nested: true,
      HTMLAttributes: { class: "tt-task-item" },
    }),
    Youtube.configure({
      controls: true,
      nocookie: true,
      HTMLAttributes: { class: "tt-youtube" },
    }),
    Placeholder.configure({
      placeholder:
        placeholder ?? "Press '/' for blocks, or just start writing…",
    }),
  ];
}

/**
 * Build a list of available command bindings used by the block menu. Each
 * entry exposes a `keywords` array used for slash-menu filtering, plus a
 * `run(editor)` callback that performs the insertion.
 */
export type BlockCommand = {
  id: string;
  label: string;
  keywords: string[];
  hint?: string;
  run(editor: Editor): void;
};
