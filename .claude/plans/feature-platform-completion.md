# Homewise FL — Platform Completion Plan

## Context

The AI-powered real estate platform has ~85-90% real implementation across 84+ routes. Type-check passes, build succeeds, 75/75 unit tests pass, all pages return 200. However, the platform cannot go to production without:

1. **Security fixes** — 14 admin API routes and all 11 AI API routes lack authentication
2. **ESLint migration** — broken (old `.eslintrc.json` format vs ESLint 9 flat config)
3. **Input validation** — AI routes use `as` type assertions instead of Zod, causing 500s on bad input
4. **Webhook security** — Resend webhook lacks signature verification; automation dispatch is stubbed
5. **API keys** — Anthropic, OpenAI, Resend, Twilio, Mapbox, etc. not configured
6. **End-to-end testing** — no manual verification of any feature with real data
7. **Production deployment** — Vercel, domain, DNS not set up

**Outcome:** A fully secured, linted, tested, and deployed platform.

---

## Phase 1: Security & Auth Hardening (CLAUDE)

> **Priority: CRITICAL** — Blocks production deployment. No API route should be publicly accessible without auth.

### Checklist

- [ ] **1.1** Add `requireAdminApi()` to 14 unprotected admin API routes
- [ ] **1.2** Create `requireAuthApi()` helper for non-admin authenticated routes
- [ ] **1.3** Add auth to 11 AI API routes (use `requireAuthApi()`)
- [ ] **1.4** Add auth to `/api/chat` route for `dashboard` and `agent` configs
- [ ] **1.5** Add Zod input validation to all 11 AI API routes
- [ ] **1.6** Add Resend webhook signature verification
- [ ] **1.7** Wire up behavioral automation dispatch

### Verification
- `npm run type-check` — zero errors
- `npm run build` — succeeds

---

## Phase 2: ESLint Migration & Code Quality (CLAUDE)

> **Priority: HIGH** — Lint is completely broken. Must fix before any code quality gates work.

### Checklist

- [ ] **2.1** Create `eslint.config.mjs` flat config
- [ ] **2.2** Archive `.eslintrc.json` to `archive/.eslintrc.json`
- [ ] **2.3** Run `npm run lint` and fix all errors
- [ ] **2.4** Update `.env.example` with all required environment variables

### Verification
- `npm run lint` — zero errors
- `npm run type-check` — zero errors
- `npm run build` — succeeds

---

## Phases 3-10: See full plan in conversation history
