"use client";

import { useEffect, useState } from "react";

interface SanitizedHtmlProps {
  html: string;
  className?: string;
}

/**
 * Renders untrusted HTML sanitized with DOMPurify. The DOMPurify import is
 * deferred to a browser-only effect via dynamic import, so isomorphic-dompurify
 * (and its jsdom server dependency) never enters the server/SSR module graph —
 * avoiding the Vercel lambda "Failed to load external module" failure that a
 * top-level server-side import triggers.
 */
export function SanitizedHtml({ html, className }: SanitizedHtmlProps) {
  const [clean, setClean] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    // Browser-only dynamic import: in the browser isomorphic-dompurify uses the
    // native window DOMPurify (never requires jsdom), and because the import is
    // triggered from an effect it never enters the server/SSR module graph.
    import("isomorphic-dompurify")
      .then((mod) => {
        if (active) setClean(mod.default.sanitize(html));
      })
      .catch(() => {
        if (active) setClean("");
      });
    return () => {
      active = false;
    };
  }, [html]);

  if (clean === null) return null;
  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
