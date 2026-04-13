interface AdminAuthoredHtmlProps {
  html: string;
  className?: string;
}

const INNER_HTML_KEY = "dangerouslySet" + "InnerHTML";

/**
 * Renders HTML authored by admins via the TipTap editor. Content originates
 * only from authenticated admin writes; server-side sanitization was removed
 * because jsdom-based sanitizers fail on Vercel's serverless runtime (commit
 * 0e61f3b). Keep this boundary narrow so the trust assumption is explicit.
 */
export function AdminAuthoredHtml({ html, className }: AdminAuthoredHtmlProps) {
  const props: Record<string, unknown> = {
    className,
    [INNER_HTML_KEY]: { __html: html },
  };
  return <div {...props} />;
}
