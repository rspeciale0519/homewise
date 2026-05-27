"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { buildExtensions } from "./extensions";
import { BlockMenu } from "./block-menu";
import { uploadEditorImage } from "./image-upload";

interface BlockEditorProps {
  /** Current HTML content. Pass an empty string for an empty editor. */
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** ARIA label for the editor surface. */
  ariaLabel?: string;
  /** Optional className for the outer wrapper. */
  className?: string;
}

interface SlashState {
  open: boolean;
  query: string;
  anchor: { x: number; y: number } | null;
}

const INITIAL_SLASH: SlashState = { open: false, query: "", anchor: null };

/**
 * Tiptap-based block editor for Training Hub content bodies. Renders the
 * editor surface, owns the slash-command menu, and wires image-insert
 * through the existing Supabase signed-upload endpoint.
 *
 * Body is persisted as HTML via Tiptap's `getHTML()` — same shape the
 * existing TrainingContentDrawer already stored from its WYSIWYG, so
 * round-tripping legacy content works without a migration.
 */
export function BlockEditor({
  value,
  onChange,
  placeholder,
  ariaLabel = "Content body",
  className,
}: BlockEditorProps) {
  const [slash, setSlash] = useState<SlashState>(INITIAL_SLASH);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: buildExtensions({ placeholder }),
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "prose prose-slate max-w-none min-h-[200px] focus:outline-none px-3 py-2",
        "aria-label": ariaLabel,
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      maybeUpdateSlashState(editor, setSlash);
    },
    onSelectionUpdate: ({ editor }) => {
      maybeUpdateSlashState(editor, setSlash);
    },
  });

  // Sync external value changes back into the editor (e.g. when an admin
  // switches the drawer to a different content row).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  const closeSlash = useCallback(() => setSlash(INITIAL_SLASH), []);

  const handleImagePick = useCallback(
    async (file: File) => {
      if (!editor) return;
      try {
        const url = await uploadEditorImage(file);
        editor.chain().focus().setImage({ src: url, alt: file.name }).run();
      } catch (err) {
        console.error("Image upload failed", err);
      }
    },
    [editor],
  );

  return (
    <div className={className}>
      <div className="border border-slate-200 rounded-lg bg-white">
        <Toolbar
          onInsertImage={() => fileInputRef.current?.click()}
          editor={editor}
        />
        <EditorContent editor={editor} />
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImagePick(f);
            e.target.value = "";
          }}
        />
      </div>
      <BlockMenu
        editor={editor}
        open={slash.open}
        query={slash.query}
        anchor={slash.anchor}
        onClose={closeSlash}
      />
    </div>
  );
}

/**
 * Inspect the editor state after every update/selection change and figure
 * out whether the slash menu should be visible. Open condition: the
 * current paragraph (or empty heading) starts with "/" and the cursor is
 * inside that trigger text.
 */
function maybeUpdateSlashState(
  editor: import("@tiptap/react").Editor,
  setSlash: (s: SlashState) => void,
): void {
  const { selection } = editor.state;
  if (!selection.empty) {
    setSlash(INITIAL_SLASH);
    return;
  }
  const $from = selection.$from;
  const blockText = $from.parent.textContent;
  if (!blockText.startsWith("/")) {
    setSlash(INITIAL_SLASH);
    return;
  }
  const cursorOffset = $from.parentOffset;
  if (cursorOffset === 0) {
    setSlash(INITIAL_SLASH);
    return;
  }
  // Query is whatever's between the leading "/" and the current cursor
  // position. If the user moves past the trigger word, close.
  const triggerEnd = blockText.indexOf(" ");
  const upperBound = triggerEnd === -1 ? blockText.length : triggerEnd;
  if (cursorOffset > upperBound) {
    setSlash(INITIAL_SLASH);
    return;
  }
  const query = blockText.slice(1, cursorOffset);
  const coords = editor.view.coordsAtPos($from.pos);
  setSlash({
    open: true,
    query,
    anchor: { x: coords.left, y: coords.top },
  });
}

interface ToolbarProps {
  editor: import("@tiptap/react").Editor | null;
  onInsertImage: () => void;
}

function Toolbar({ editor, onInsertImage }: ToolbarProps) {
  if (!editor) return null;
  const cls = (active: boolean) =>
    `px-2 py-1 text-xs rounded transition-colors ${
      active ? "bg-navy-100 text-navy-700" : "text-slate-600 hover:bg-slate-100"
    }`;
  return (
    <div
      role="toolbar"
      aria-label="Formatting"
      className="flex items-center gap-1 border-b border-slate-100 px-2 py-1.5 text-sm"
    >
      <button
        type="button"
        className={cls(editor.isActive("bold"))}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        Bold
      </button>
      <button
        type="button"
        className={cls(editor.isActive("italic"))}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        Italic
      </button>
      <button
        type="button"
        className={cls(editor.isActive("heading", { level: 2 }))}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        type="button"
        className={cls(editor.isActive("bulletList"))}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        List
      </button>
      <button
        type="button"
        className={cls(editor.isActive("link"))}
        onClick={() => {
          const url = window.prompt("Link URL");
          if (!url) return;
          editor.chain().focus().toggleLink({ href: url }).run();
        }}
      >
        Link
      </button>
      <button
        type="button"
        className="px-2 py-1 text-xs rounded text-slate-600 hover:bg-slate-100 transition-colors"
        onClick={onInsertImage}
      >
        Image
      </button>
      <span className="ml-auto text-[10px] text-slate-400 hidden sm:inline">
        Tip: press &quot;/&quot; for blocks
      </span>
    </div>
  );
}
