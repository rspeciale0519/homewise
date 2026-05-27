import type { BlockCommand } from "./extensions";

/**
 * Catalogue of block types insertable via the slash menu. The list is
 * pure data so it's trivially unit-testable for keyword filtering.
 */
export const BLOCK_COMMANDS: readonly BlockCommand[] = [
  {
    id: "h1",
    label: "Heading 1",
    keywords: ["heading", "h1", "title", "header"],
    hint: "Large section title",
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Heading 2",
    keywords: ["heading", "h2", "subhead", "header"],
    hint: "Subsection title",
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: "h3",
    label: "Heading 3",
    keywords: ["heading", "h3", "subsection"],
    hint: "Smaller subsection title",
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: "paragraph",
    label: "Paragraph",
    keywords: ["paragraph", "p", "text", "body"],
    hint: "Plain text",
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: "bullet-list",
    label: "Bulleted list",
    keywords: ["bullet", "list", "ul", "unordered"],
    hint: "Unordered list",
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered-list",
    label: "Numbered list",
    keywords: ["number", "ordered", "list", "ol"],
    hint: "Ordered list",
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "task-list",
    label: "To-do list",
    keywords: ["task", "todo", "checklist", "check"],
    hint: "Checkable items",
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "blockquote",
    label: "Quote",
    keywords: ["quote", "blockquote", "citation"],
    hint: "Indented quotation",
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: "code",
    label: "Code block",
    keywords: ["code", "snippet", "monospace"],
    hint: "Fixed-width code",
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: "hr",
    label: "Divider",
    keywords: ["divider", "hr", "rule", "separator"],
    hint: "Horizontal rule",
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

/**
 * Filter the block command catalogue by a query string. Empty queries
 * return the full list. Matches are case-insensitive against both the
 * label and the keywords array.
 */
export function filterBlockCommands(
  query: string,
  commands: readonly BlockCommand[] = BLOCK_COMMANDS,
): BlockCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return [...commands];
  return commands.filter(
    (c) =>
      c.label.toLowerCase().includes(q) ||
      c.keywords.some((kw) => kw.toLowerCase().includes(q)),
  );
}
