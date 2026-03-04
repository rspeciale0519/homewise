"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";

interface TiptapEditorProps {
  content: string;
  onChange: (html: string) => void;
  /** "sm" = min 160px, "md" = min 240px (default) */
  size?: "sm" | "md";
}

function Btn({
  onClick,
  active,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`px-1.5 py-0.5 text-[11px] rounded transition-colors ${
        active ? "bg-navy-600 text-white" : "text-slate-600 hover:bg-slate-200"
      }`}
    >
      {children}
    </button>
  );
}

export function TiptapEditor({ content, onChange, size = "md" }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  if (!editor) return null;

  const addLink = () => {
    const url = window.prompt("Enter URL:");
    if (url) editor.chain().focus().setLink({ href: url }).run();
  };

  const minHClass = size === "sm"
    ? "[&_.ProseMirror]:min-h-[160px]"
    : "[&_.ProseMirror]:min-h-[240px]";

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-slate-200 bg-slate-50 flex-wrap">
        <Btn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")}>
          <strong>B</strong>
        </Btn>
        <Btn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")}>
          <em>I</em>
        </Btn>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })}>H2</Btn>
        <Btn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })}>H3</Btn>
        <Btn onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive("paragraph")}>P</Btn>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <Btn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")}>UL</Btn>
        <Btn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")}>OL</Btn>
        <span className="w-px h-4 bg-slate-300 mx-1" />
        <Btn onClick={addLink} active={editor.isActive("link")}>Link</Btn>
        {editor.isActive("link") && (
          <Btn onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</Btn>
        )}
      </div>
      <EditorContent
        editor={editor}
        className={`${minHClass} [&_.ProseMirror]:px-3 [&_.ProseMirror]:py-2 [&_.ProseMirror]:text-sm [&_.ProseMirror]:outline-none [&_.ProseMirror]:prose [&_.ProseMirror]:prose-sm [&_.ProseMirror]:max-w-none`}
      />
    </div>
  );
}
