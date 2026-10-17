# Security scan — 2026-10-17

Full-repo review of Homewise (Next.js 16 App Router, Prisma, Supabase, Stripe). Method: broad sweep, then an independent adversarial pass on every candidate (re-trace the path, look for other guards, try to write a failing test). Attack tests used mocked users A, B, and admin only. No production traffic, no real email/SMS, no real card charges, no database writes.

**Live secrets:** none found in tracked files or git history. Placeholders and test fixture strings exist (path:line only): `.env.example`; `src/lib/api-error.test.ts:12`; `src/app/api/billing/invoices/[id]/pay/route.test.ts:81`. Do not treat those as live credentials.

---

## Critical

None confirmed in application code. Dependency CVEs below are owner action.

---

## High

### H1. AI spend limiter lived only in one server process
Anyone with a staff session could burn model budget by sending parallel requests across Vercel instances, because the cap was an in-memory array.

- **Where:** `src/lib/ai/index.ts` (former in-process log; now `src/lib/ai/rate-limit.ts:7`)
- **Proof:** `npx vitest run src/lib/ai/rate-limit.test.ts` — 4 passed. Rules always include a shared `global` bucket (30/min) plus a per-user bucket when a caller id is present; denials and “limiter unavailable” fail closed.
- **Fix in this PR:** yes. Completions now use the existing Postgres `DistributedRateLimiter`.
- **Owner action:** none for the code path. Watch AI usage after deploy.

### H2. Next.js 16.3.2 has known critical CVEs
Installed Next.js is `16.3.2` (`package.json:60`). `npm audit` reports unauthenticated RCE classes in the 16.0.0–16.3.7 range (Windows servers, image optimization / AVIF, `next/og`). This environment is Linux, but image-optimization issues are still in scope.

- **Where:** `package.json:60`
- **Proof:** `node -p "require('next/package.json').version"` → `16.3.2`; `npm audit --omit=dev` → `next:critical`, `proxy-addr:critical`.
- **Fix in this PR:** no. Bumping Next is an owner decision (preview deploy + smoke).
- **Owner action:** upgrade Next.js to a patched 16.x (≥ 16.3.8 per current advisory range) on a preview, then production.

### H3. Supabase RLS cannot be proven from this repo
The app talks to Postgres through Prisma (bypasses RLS). The anon key is public by design. If any table or storage bucket is exposed with RLS off or a permissive policy, a browser can skip Next.js auth.

- **Where:** `prisma/schema.prisma:7`; `src/lib/supabase/client.ts:5`; `src/lib/supabase/admin.ts:9`
- **Proof:** no `supabase/` SQL migrations in the repo. Service-role key is server-only (not `NEXT_PUBLIC_*`). Browser code does not call `.from("table")`.
- **Fix in this PR:** no (dashboard-only).
- **Owner action:** in the Supabase dashboard, confirm RLS is on for every exposed table and that storage policies match intent (`documents`, `training-files`, `manual-listing-photos`, `mls-photos`, `user-avatars`, `direct-mail-orders`).

---

## Medium

### M1. Training articles stored raw HTML
Admin training create/update wrote TipTap HTML straight to the database. Public `/learn` sanitizes in the browser, but a future render path (or a sanitizer miss) would execute stored XSS. SEO content was already sanitized on write.

- **Where:** `src/app/api/admin/training/[id]/route.ts:81`; `src/app/api/admin/training/route.ts:117`
- **Proof:** `npx vitest run src/app/api/admin/training/[id]/route.test.ts` — 5 passed, including “sanitizes stored HTML so scripts never reach the public learn page” (`<script>` and `javascript:` stripped before Prisma update).
- **Fix in this PR:** yes. `sanitizeRichHtml()` on create and patch; JSON body size cap added.

### M2. Campaign emails stored raw HTML
Campaign bodies were saved unsanitized and only cleaned at send time. A missed send-path would mail raw HTML.

- **Where:** `src/app/api/admin/campaigns/[id]/emails/route.ts:63`
- **Proof:** `npx vitest run src/app/api/admin/campaigns/[id]/emails/route.test.ts` — 2 passed. Non-admin is 403; stored body keeps `<p>Offer</p>` and drops `<script>` / `javascript:`.
- **Fix in this PR:** yes. Zod + `sanitizeRichHtml` on write.

### M3. Signed MLS photo URLs never expired
HMAC stopped SSRF (host allowlist + DNS checks) but a leaked `/api/mls-photo?u=&sig=` URL worked forever and could keep hitting the MLS origin.

- **Where:** `src/lib/mls-image.ts:263`
- **Proof:** `npx vitest run src/lib/mls-image.test.ts src/app/api/mls-photo/route.test.ts` — passed. “rejects expired or unsigned photo URLs” fails closed when `exp` is missing or in the past.
- **Fix in this PR:** yes. Windowed `exp` is included in the HMAC. Cached HTML older than about 24–48 hours will need a page re-render to refresh photo URLs.

### M4. Site had no Content-Security-Policy
Headers included HSTS, frame deny, nosniff — not CSP. Any XSS could load external scripts.

- **Where:** `next.config.ts:65`
- **Proof:** `npx vitest run tests/next-security-headers.test.ts` — 1 passed (`base-uri 'self'`, `object-src 'none'`, `frame-ancestors 'none'`).
- **Fix in this PR:** yes. Conservative CSP only (does not set `script-src`, so Next/Stripe/Mapbox keep working). Owner can tighten later with nonces.

### M5. Tracking cookies lacked `Secure` and accepted any `?source=`
Lead-source and listing-view cookies could be set over HTTP, and `source` was copied into a cookie without a charset/length check.

- **Where:** `src/proxy.ts:10`; `src/lib/crm/lead-source.ts:13`; `src/lib/crm/lead-source-value.ts:3`
- **Proof:** `npx vitest run src/lib/crm/lead-source.test.ts` — 2 passed. Values like `google-ads` allowed; CR/LF and `evil; Path=/` rejected.
- **Fix in this PR:** yes. `secure` in production; allowlist `^[A-Za-z0-9._-]{1,64}$`.

### M6. Rich HTML sanitizer allowed `data:` images and any CSS
Email/SEO sanitizer allowed `data:` image URLs and `.*` style values, which is wider than needed for TipTap.

- **Where:** `src/lib/sanitize-rich-html.ts:27`
- **Proof:** `npx vitest run src/lib/sanitize-rich-html.test.ts` — passed. `data:` stripped; `expression(` CSS dropped; hex color and `width:10px` kept.
- **Fix in this PR:** yes. `http`/`https` images only; tight style regexes.

### M7. Admin card charge did not check the payment method’s customer
Admin could pass any `paymentMethodId`. Stripe often rejects a cross-customer PM, but the route never asserted `paymentMethod.customer === agent customer`.

- **Where:** `src/app/api/admin/billing/agents/[id]/payment/route.ts:182`
- **Proof:** `npx vitest run src/app/api/admin/billing/agents/[id]/payment/route.test.ts` — passed, including “rejects a payment method that belongs to another Stripe customer” (404, no PaymentIntent).
- **Fix in this PR:** yes. Retrieve PM and require customer match before confirm.

### M8. Training editor builds public storage URLs for a private bucket
Setup creates `training-files` as private; the block editor embeds `/storage/v1/object/public/training-files/...`. If ops “fix” broken images by making the bucket public, training files become world-readable.

- **Where:** `src/components/admin/block-editor/image-upload.ts:69`; `scripts/setup-training-bucket.ts:41`
- **Proof:** code review only (no live storage checks).
- **Fix in this PR:** no. Needs a signed-URL or authenticated proxy design.
- **Owner action:** confirm the bucket is private. If images already work in prod, the bucket may already be public — lock it and switch the editor to signed URLs.

### M9. Home valuation AI is staff-gated but not a billed entitlement
Other staff AI routes call `reserveStaffFeature`. Home valuation does not, so any agent can spend that model. Evaluation IDs are `cuid()` and not listed to agents, so email-collision IDOR is hard without the id.

- **Where:** `src/app/api/ai/home-valuation/route.ts:16`
- **Proof:** `npx vitest run src/app/api/ai/home-valuation/route.test.ts` — 2 passed. Non-staff 403; agent without a matching assigned contact 404 and no model call.
- **Fix in this PR:** regression tests only. Not billed-gated (no `home_valuation` entitlement key in seed).
- **Owner action:** decide whether this should consume `ai_cma_reports` (or a new entitlement).

---

## Low

### L1. Public agent directory returns email and phone
- **Where:** `src/app/api/agents/route.ts:52`
- **Proof:** `src/app/api/agents/route.test.ts` documents these as public display fields (invite codes are excluded). Same info is on marketing pages.
- **Fix in this PR:** no (product intent).

### L2. Public chat can adopt a body `sessionId` when the cookie is missing
- **Where:** `src/app/api/chat/route.ts:92`
- **Proof:** `src/app/api/chat/route.test.ts` “adopts a matching legacy public session into an HttpOnly cookie”. Takeover still needs both conversation id and session id.
- **Fix in this PR:** no (legacy migration).

### L3. MLS media byte budget is per serverless instance
- **Where:** `src/lib/mls-media-budget.ts:90`
- **Proof:** in-process `globalThis` store. Photo URLs now expire (M3), which reduces replay window.
- **Fix in this PR:** no. Owner can later share the budget via Postgres like other rate limits.

### L4. Billing grace “lockout” is UI-only
- **Where:** `src/app/api/billing/subscription/route.ts` (`getGraceStatus`)
- **Proof:** `locked_*` is not read by staff API guards. `past_due` already loses paid entitlements via Stripe status.
- **Fix in this PR:** no (product policy).

### L5. Mapbox token is `NEXT_PUBLIC_`
- **Where:** `src/lib/commute.ts:5`; listing map components
- **Proof:** required for client maps. Abuse is quota, not data theft.
- **Fix in this PR:** no. Restrict the token by URL in the Mapbox dashboard.

### L6. External document links 302 to admin-supplied URLs
- **Where:** `src/app/api/documents/by-slug/[slug]/route.ts:70`
- **Proof:** staff-only route; URL must already be `http`/`https`. Phishing would require a malicious admin document.
- **Fix in this PR:** no.

---

## Info

### I1. No GitHub Actions workflows
No `.github/workflows`. CI is Vercel (and local `npm run verify`). `pull_request_target` not present.

### I2. No `"use server"` actions
Mutations are Route Handlers. `src/proxy.ts` matcher excludes `/api`; each route must self-auth. Admin/staff/user helpers use `getUser()`, not `getSession()`.

### I3. Stripe / Resend / Twilio webhooks verify signatures
Stripe uses raw body + `constructEvent` (`src/app/api/webhooks/stripe/route.ts:51`). Stripe’s default 5-minute timestamp plus a live `subscriptions.retrieve` makes signed-event replay a no-op for entitlements. Not filed as a bug.

### I4. Privilege escalation and IDOR (A vs B) already blocked
Attack tests (this PR):

- User A cannot rename/delete user B’s saved search (`src/app/api/user/saved-searches/[id]/route.test.ts`)
- User A cannot set `role: "admin"` on their profile (`src/app/api/user/profile/route.test.ts`)
- Agent A cannot run home-valuation on an evaluation whose email they do not own
- Chat already rejects cross-config and cross-user conversations

Checkout prices come from server-side `productConfig`, not client `priceId`.

### I5. Dependency audit (owner)
`npm audit --omit=dev` at scan time: 2 critical (`next`, `proxy-addr`), plus high on `@tiptap/core` / `prosemirror-view` (XSS/ReDoS), `sharp`, `undici`, `brace-expansion`, `source-map-js`, `@grpc/grpc-js`. Do not `npm audit fix --force` blindly.

### I6. Candidates that did not survive the adversarial pass
- Unauthenticated admin/training item routes (historical): all `/api/admin/**` call `requireAdminApi`
- Stripe webhook unbounded replay: timestamp tolerance + live Stripe retrieve
- Public forms (contact, showing, alerts, commute): distributed rate limits present
- SQL injection: parameterized Prisma / tagged `$queryRaw` only; no `$queryRawUnsafe`
- Open auth redirects: `safeAuthRedirectPath` + tests
- CORS `*`: none
- `Math.random` for secrets: not used for tokens (nanoid / `crypto.randomUUID`)
- Service-role key in the browser: not referenced from `"use client"` files

---

## Test evidence (local)

```
npx vitest run   # 195 files, 1129 passed
npx tsc --noEmit # exit 0
npx eslint <changed files> # exit 0
```

Targeted security files: 14 files, 101 passed, including the new attack tests above.

---

## What this PR changes vs owner-only

| ID | Status |
|----|--------|
| H1 AI distributed rate limit | **Fixed in PR** |
| M1 Training HTML sanitize-on-write | **Fixed in PR** |
| M2 Campaign HTML sanitize-on-write | **Fixed in PR** |
| M3 MLS photo URL expiry | **Fixed in PR** |
| M4 CSP | **Fixed in PR** |
| M5 Cookie flags + source allowlist | **Fixed in PR** |
| M6 Sanitizer `data:` / CSS | **Fixed in PR** |
| M7 Admin payment method customer check | **Fixed in PR** |
| H2 Next.js CVEs | **Owner:** upgrade Next |
| H3 Supabase RLS | **Owner:** dashboard review |
| M8 training-files public vs private | **Owner:** storage policy + signed URLs |
| M9 Home valuation entitlement | **Owner:** product decision |
| npm high/critical transitive | **Owner:** staged upgrades |

No credentials were rotated. No production settings changed. No migrations were run.
