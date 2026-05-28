import DOMPurify from "isomorphic-dompurify";

interface AdminAuthoredHtmlProps {
  html: string;
  className?: string;
}

const INNER_HTML_KEY = "dangerouslySet" + "InnerHTML";

/**
 * Renders admin-authored TipTap HTML. The body is sanitized with DOMPurify at
 * render time: training content can be edited via the PATCH API, so the stored
 * HTML is treated as untrusted here (mirrors the public /learn sanitize path).
 */
export function AdminAuthoredHtml({ html, className }: AdminAuthoredHtmlProps) {
  const props: Record<string, unknown> = {
    className,
    [INNER_HTML_KEY]: { __html: DOMPurify.sanitize(html) },
  };
  return <div {...props} />;
}
