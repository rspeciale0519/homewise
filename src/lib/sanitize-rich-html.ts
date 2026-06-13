import sanitizeHtml from "sanitize-html";

/**
 * Server-safe rich-HTML sanitizer for admin-authored content (TipTap output:
 * broadcast email bodies, SEO content). Uses sanitize-html (pure JS, no jsdom),
 * so it runs in the Vercel lambda without the "Failed to load external module"
 * failure that isomorphic-dompurify/jsdom causes server-side. The allowlist is
 * generous enough to preserve normal rich formatting while stripping scripts,
 * event handlers, and unsafe URL schemes.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "h5", "h6",
    "p", "br", "hr", "blockquote", "pre", "code",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "mark", "small", "span",
    "ul", "ol", "li",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
    "div",
  ],
  allowedAttributes: {
    a: ["href", "name", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "style"],
    "*": ["class", "style", "id", "align", "colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedStyles: {
    "*": {
      color: [/.*/],
      "background-color": [/.*/],
      "text-align": [/^(left|right|center|justify)$/],
      "font-weight": [/.*/],
      "font-style": [/.*/],
      "text-decoration": [/.*/],
      width: [/.*/],
      height: [/.*/],
    },
  },
  // Add a safe rel to links (merge=true keeps href and other attributes).
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

export function sanitizeRichHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
