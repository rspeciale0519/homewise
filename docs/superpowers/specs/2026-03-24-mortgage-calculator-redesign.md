# Mortgage Calculator Page Redesign

**Date:** 2026-03-24
**Status:** Approved
**Branch:** `feature/ai-model-tiering` (current working branch)

---

## Overview

Redesign the `/mortgage-calculator` page to be visually consistent with the rest of the site, add meaningful educational content, surface both the quick slider calculator and the AI Scenario Advisor on the same page, and gate the AI Advisor behind a free account signup to drive lead generation.

---

## Goals

1. Make the page visually match the site's design system (hero, Container, CtaBanner, etc.)
2. Add enough content that users understand what the AI advisor does and why it benefits them
3. Expose both calculator tools on a single page with a clear hierarchy
4. Gate the AI Advisor behind Supabase auth to drive free account registrations
5. Fix two existing bugs: silent error handling and missing error state

---

## Page Structure

Four zones, top to bottom:

### 1. Hero — Dark Navy Gradient

Matches the Home Evaluation page pattern (`bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950`) with the subtle grid SVG overlay and crimson blur orb.

**Contents:**
- Breadcrumb: Home → Mortgage Calculator
- Eyebrow: "For Buyers" (crimson, uppercase, tracked)
- Headline: "Know Your Numbers Before You Shop" (serif, white)
- Subhead: "Run a quick payment estimate or let our AI build personalized mortgage scenarios around your actual financial profile — so you walk into every showing with confidence."
- **3-step How It Works row** (horizontal on desktop, stacked on mobile):
  - Step 1: "Enter your details" — Income, debt, down payment, credit score
  - Step 2: "AI analyzes your profile" — Matches you to loan types and realistic price ranges
  - Step 3: "Get 3 personalized scenarios" — Conservative, Moderate, and Stretch with full breakdowns

Each step card: number badge + title + body text, rendered in semi-transparent white cards with a subtle border.

---

### 2. Quick Calculator Section

**Background:** White
**Container:** `Container` component, centered
**Section header:**
- Eyebrow: "Instant Estimate" (crimson)
- Heading: "Run the Numbers"
- Subtext: "Adjust the sliders to estimate your monthly payment. Includes principal, interest, taxes, and insurance."

**Component:** Existing `MortgageCalculator` from `@/components/shared/mortgage-calculator` — no changes to the component itself. Rendered inside `<Container size="md">` with an inner `<div className="max-w-lg mx-auto">` wrapper to center the card.

---

### 3. AI Advisor Section

**Background:** `bg-cream-50` (`#fafaf8` — confirmed in tailwind config)
**Container:** `<Container size="lg">` (max-w-6xl) to constrain the form at wide viewports
**Section header:**
- Eyebrow: "AI-Powered" (crimson)
- Heading: "Get Personalized Scenarios"
- Subtext: "Tell us about your financial situation and our AI will generate three tailored mortgage scenarios — Conservative, Moderate, and Stretch — with full breakdowns of loan type, payment, and key tradeoffs."
- **Auth nudge** (shown when user is not logged in, above the form): Small inline banner rendered inside `MortgageAdvisor` (not in `page.tsx`) — "Free account required to generate scenarios. Takes less than a minute to sign up." with Sign Up link. `page.tsx` remains a Server Component and must not call `useSupabase()`. All auth-aware rendering lives inside `MortgageAdvisor`.

**Component:** `MortgageAdvisor` — modified (see Component Changes below).

---

### 4. CTA Banner

`CtaBanner` variant `navy`:
- Eyebrow: "Ready to Take the Next Step?"
- Title: "Get Pre-Approved Today"
- Subtitle: "Our mortgage partners can provide a full pre-approval — not just a pre-qualification — so you can make strong offers with confidence."
- Primary CTA: "Get Pre-Approved" → `/contact`
- Secondary CTA: "Find an Agent" → `/agents`

---

## Component Changes

### `src/app/(marketing)/mortgage-calculator/page.tsx`

Full rewrite. Changes:
- Use `Container` from `@/components/ui/container`
- Add `CtaBanner` from `@/components/shared/cta-banner`
- Import `MortgageCalculator` from `@/components/shared/mortgage-calculator`
- Build the hero section with navy gradient, grid overlay, breadcrumb, headline, subhead, 3-step row
- Build Quick Calculator section
- Build AI Advisor section with section header
- Add `CtaBanner` at bottom
- Keep `MortgageAdvisor` import from `./mortgage-advisor`

### `src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx`

Targeted changes only:

1. **Auth awareness:** Import `useSupabase` from `@/components/providers/supabase-provider`. On form submit, check `user`. If null, skip API call and set a new `gated` state flag to `true` instead.

2. **Auth gate UI:** When `gated === true`, render an inline panel where results would appear:
   - Lock icon (SVG)
   - Heading: "Your scenarios are ready to generate"
   - Body: "Create a free account to unlock your personalized AI mortgage scenarios — it takes less than a minute."
   - Buttons: "Create Free Account" → `/register`, "Log In" → `/login`
   - Note: "Your details above are saved — just sign in and submit again." (form stays populated)
   - The gate panel resets to `false` if the user modifies any form field. Because the form uses six independent `useState` setters (`setIncome`, `setDebt`, `setDownPayment`, `setCreditScore`, `setHomePrice`, `setDescription`), `setGated(false)` must be added to all six `onChange` handlers — including the `select` (credit score) and the standalone `description` text input which are not routed through the `InputField` helper component.

3. **Error state:** Replace `catch { /* ignore */ }` with proper error state. New `error` state string. On catch, set `error = "Something went wrong generating your scenarios. Please try again."`. Render error inline above the submit button area when set. Clear on next submit attempt.

4. **Loading skeleton:** While `loading === true` and no results yet, render three skeleton cards matching the scenario card dimensions (`rounded-xl`, `border`, `h-48`) with a shimmer animation (`animate-pulse bg-slate-100`) instead of the empty results area.

---

## Auth Pattern

Uses existing `useSupabase()` hook from `@/components/providers/supabase-provider`:

```ts
const { user, loading: authLoading } = useSupabase();
```

- `user === null && !authLoading` → unauthenticated
- `user !== null` → authenticated, proceed normally
- Do not block the form from rendering while `authLoading` is true — the form is always visible

---

## What Is Not Changing

- The `MortgageCalculator` shared component (`src/components/shared/mortgage-calculator.tsx`) — no changes
- The API route (`src/app/api/ai/mortgage-advisor/route.ts`) — no changes
- The scenario card rendering logic in `MortgageAdvisor` — no changes to result display
- The form fields themselves — no changes

---

## Files Touched

| File | Change Type |
|------|-------------|
| `src/app/(marketing)/mortgage-calculator/page.tsx` | Full rewrite |
| `src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx` | Targeted additions |

---

## Out of Scope

- Mobile app considerations
- Saving scenarios to a user's account
- Analytics/tracking events
- A/B testing the gate copy
