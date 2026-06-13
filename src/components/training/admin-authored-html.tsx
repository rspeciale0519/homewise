import { SanitizedHtml } from "@/components/shared/sanitized-html";

interface AdminAuthoredHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders admin-authored TipTap HTML. Sanitization happens browser-side via
 * SanitizedHtml (deferred DOMPurify import), so isomorphic-dompurify/jsdom never
 * enters the server module graph — training content can be edited via the PATCH
 * API, so the stored HTML is still treated as untrusted at render time.
 */
export function AdminAuthoredHtml({ html, className }: AdminAuthoredHtmlProps) {
  return <SanitizedHtml html={html} className={className} />;
}
