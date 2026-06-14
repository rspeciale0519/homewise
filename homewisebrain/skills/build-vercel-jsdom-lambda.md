---
type: skill
area: build
status: established
confidence: established
updated: 2026-06-14
sources:
  - journal:2026-06-13
  - code:src/components/shared/sanitized-html.tsx
  - code:src/lib/sanitize-rich-html.ts
---

# Keep jsdom (isomorphic-dompurify) out of the Vercel lambda

## When to use
Any time HTML must be sanitized in this Next.js app — SEO/market content, `/learn`,
admin-authored HTML, TipTap/broadcast email bodies, or API routes that store/send rich
HTML. Symptom this prevents: a route works on local `next start` but returns a 500 only
on Vercel with **"Failed to load external module"**.

## The approach
`isomorphic-dompurify` lazy-`require`s `jsdom` at server module-load. Vercel's lambda
file-tracer (under Turbopack) drops jsdom, so any module that imports it server-side
crashes in prod only (local has full `node_modules`, so it never reproduces locally).

Two correct fixes, by surface:
- **Display-only sanitize** (content rendered to the page): use the browser-only
  `SanitizedHtml` client component — it does a *deferred* `import("isomorphic-dompurify")`
  inside `useEffect`, so jsdom never enters the server module graph. Tradeoff: that body
  renders client-side (minor SEO cost, strictly better than a 500).
- **Must-sanitize-on-server** (routes that store/send content, e.g.
  `/api/admin/broadcasts`, `/api/admin/seo-content`): use `src/lib/sanitize-rich-html.ts`
  built on **`sanitize-html`** (pure JS, no jsdom) with a generous allowlist preserving
  TipTap/email formatting.

## Pitfalls & anti-patterns
- `serverExternalPackages` does **NOT** fix it under Turbopack — proven insufficient
  (commit 0d33324). Don't rely on it.
- Don't reach for `isomorphic-dompurify` server-side at all anymore — it's retained ONLY
  for the deferred browser-only import inside `SanitizedHtml`.
- `sanitizeHtml.simpleTransform("a", {rel}, false)` REPLACES attribs (drops href) — pass
  `merge=true`.
- Can't reproduce locally → must verify the fix on the actual Vercel deployment.

## Evidence
Prod-verified on app.homewisefl.com: /market, /learn, /admin/broadcasts all 500→200;
broadcasts API draft POST returned 201 with server-sanitized body (kept `<strong>`,
stripped `<script>`). Recurred across 4+ independent surfaces, each fixed by one of the
two patterns. tsc/lint/vitest/build green per commit (ca5bdb5, 1c2fb40, 9303eac).

## Revision log
- 2026-06-14: distilled during consolidation from the 2026-06-13 dompurify saga.
