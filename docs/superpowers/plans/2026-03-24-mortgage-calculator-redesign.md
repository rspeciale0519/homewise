# Mortgage Calculator Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `/mortgage-calculator` to match the site's design system, add educational hero content, expose both calculator tools with proper section structure, and gate the AI Scenario Advisor behind Supabase auth with an inline signup prompt.

**Architecture:** `page.tsx` is a full rewrite as a Server Component — it owns all layout, hero, section structure, and the CTA banner. Auth-aware rendering (gate nudge, gate panel, error state, skeleton) all lives inside `mortgage-advisor.tsx` (Client Component) so `page.tsx` never needs to call `useSupabase()`. The shared `MortgageCalculator` widget and API route are untouched.

**Tech Stack:** Next.js 15 App Router, Supabase auth via `useSupabase()` hook, Tailwind CSS (navy/crimson/cream/slate tokens), existing components: `Container`, `CtaBanner`, `MortgageCalculator`, `MortgageAdvisor`.

**Spec:** `docs/superpowers/specs/2026-03-24-mortgage-calculator-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/(marketing)/mortgage-calculator/page.tsx` | Full rewrite | Server Component — hero, section layout, CTA banner |
| `src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx` | Modify | Add auth gate state, auth nudge, gate panel, error state, loading skeleton |

No other files are touched.

---

## Task 1: Rewrite `page.tsx` — Hero Section

**Files:**
- Modify: `src/app/(marketing)/mortgage-calculator/page.tsx`

The current `page.tsx` is a bare `<div>` with a title and `<MortgageAdvisor />`. Replace the entire file.

- [ ] **Step 1: Replace `page.tsx` with the hero skeleton**

Write the full file with imports and the hero section only. The Quick Calculator and AI Advisor sections come in later tasks — use placeholder `{/* TODO */}` comments for now so we can verify-compile incrementally.

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/container";
import { CtaBanner } from "@/components/shared/cta-banner";
import { MortgageCalculator } from "@/components/shared/mortgage-calculator";
import { MortgageAdvisor } from "./mortgage-advisor";

export const metadata: Metadata = {
  title: "Mortgage Calculator — Homewise FL",
  description:
    "Run a quick payment estimate or get three personalized AI mortgage scenarios built around your financial profile.",
};

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Enter your details",
    body: "Income, monthly debt, down payment, and credit score range.",
  },
  {
    step: "02",
    title: "AI analyzes your profile",
    body: "Matches you to loan types and realistic price ranges for your situation.",
  },
  {
    step: "03",
    title: "Get 3 personalized scenarios",
    body: "Conservative, Moderate, and Stretch — each with full payment breakdowns.",
  },
];

export default function MortgageCalculatorPage() {
  return (
    <>
      {/* ── Hero ── */}
      <div className="relative bg-gradient-to-br from-navy-800 via-navy-700 to-navy-950 overflow-hidden">
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]" aria-hidden="true">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        {/* Crimson glow orb */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-crimson-600/10 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />

        <Container className="pt-16 pb-14 relative z-10">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="mb-6">
            <ol className="flex items-center gap-2 text-xs text-slate-400">
              <li>
                <Link href="/" className="hover:text-slate-200 transition-colors">
                  Home
                </Link>
              </li>
              <li className="flex items-center gap-2">
                <svg className="h-3 w-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span className="text-slate-300">Mortgage Calculator</span>
              </li>
            </ol>
          </nav>

          {/* Headline block */}
          <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-400 mb-3">
            For Buyers
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl font-semibold text-white leading-tight text-balance max-w-3xl mb-4">
            Know Your Numbers Before You Shop
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl leading-relaxed mb-10">
            Run a quick payment estimate or let our AI build personalized mortgage scenarios around
            your actual financial profile — so you walk into every showing with confidence.
          </p>

          {/* How It Works row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="flex gap-4 bg-white/5 border border-white/10 rounded-xl px-5 py-4"
              >
                <span className="font-serif text-3xl font-bold text-white/20 leading-none shrink-0 w-10 text-right">
                  {item.step}
                </span>
                <div className="pt-0.5">
                  <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                  <p className="text-xs text-slate-400 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* TODO: Quick Calculator section */}
      {/* TODO: AI Advisor section */}
      {/* TODO: CTA Banner */}
    </>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors. If TypeScript errors appear, fix them before continuing.

- [ ] **Step 3: Commit**

```bash
git add src/app/(marketing)/mortgage-calculator/page.tsx
git commit -m "feat: add mortgage calculator hero section with how-it-works row"
```

---

## Task 2: Add Quick Calculator Section to `page.tsx`

**Files:**
- Modify: `src/app/(marketing)/mortgage-calculator/page.tsx`

Replace the `{/* TODO: Quick Calculator section */}` comment with the full section.

- [ ] **Step 1: Add the Quick Calculator section**

Replace `{/* TODO: Quick Calculator section */}` with:

```tsx
      {/* ── Quick Calculator ── */}
      <section className="section-padding bg-white">
        <Container size="md">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">
              Instant Estimate
            </p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-3">
              Run the Numbers
            </h2>
            <p className="text-slate-500 max-w-xl mx-auto text-sm leading-relaxed">
              Adjust the sliders to estimate your monthly payment. Includes principal, interest,
              property taxes, and home insurance.
            </p>
          </div>
          <div className="max-w-lg mx-auto">
            <MortgageCalculator />
          </div>
        </Container>
      </section>
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/(marketing)/mortgage-calculator/page.tsx
git commit -m "feat: add quick calculator section to mortgage calculator page"
```

---

## Task 3: Add AI Advisor Section and CTA Banner to `page.tsx`

**Files:**
- Modify: `src/app/(marketing)/mortgage-calculator/page.tsx`

Replace the two remaining `{/* TODO */}` comments.

- [ ] **Step 1: Add the AI Advisor section and CTA Banner**

Replace `{/* TODO: AI Advisor section */}` and `{/* TODO: CTA Banner */}` with:

```tsx
      {/* ── AI Scenario Advisor ── */}
      <section className="section-padding bg-cream-50">
        <Container size="lg">
          <div className="text-center mb-10">
            <p className="text-xs font-semibold tracking-[0.2em] uppercase text-crimson-600 mb-3">
              AI-Powered
            </p>
            <h2 className="font-serif text-display-md font-semibold text-navy-700 mb-3">
              Get Personalized Scenarios
            </h2>
            <p className="text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
              Tell us about your financial situation and our AI will generate three tailored mortgage
              scenarios — Conservative, Moderate, and Stretch — with full breakdowns of loan type,
              payment, and key tradeoffs.
            </p>
          </div>
          <MortgageAdvisor />
        </Container>
      </section>

      {/* ── CTA Banner ── */}
      <CtaBanner
        eyebrow="Ready to Take the Next Step?"
        title="Get Pre-Approved Today"
        subtitle="Our mortgage partners can provide a full pre-approval — not just a pre-qualification — so you can make strong offers with confidence."
        primaryCta={{ label: "Get Pre-Approved", href: "/contact" }}
        secondaryCta={{ label: "Find an Agent", href: "/agents" }}
        variant="navy"
      />
```

- [ ] **Step 2: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(marketing)/mortgage-calculator/page.tsx
git commit -m "feat: complete mortgage calculator page layout with AI advisor section and CTA banner"
```

---

## Task 4: Add Auth Gate to `mortgage-advisor.tsx`

**Files:**
- Modify: `src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx`

This task adds:
1. `useSupabase()` import and auth state
2. `gated` state (shown when unauthenticated user submits)
3. Auth nudge banner (shown above form when not logged in)
4. Inline gate panel (shown where results appear after unauthenticated submit)
5. `setGated(false)` on all 6 field change handlers

- [ ] **Step 1: Add `useSupabase` import and `gated` state**

At the top of `mortgage-advisor.tsx`, add the import after the existing React import:

```tsx
import { useSupabase } from "@/components/providers/supabase-provider";
```

Inside `MortgageAdvisor()`, after the existing state declarations, add:

```tsx
  const { user } = useSupabase();
  const [gated, setGated] = useState(false);
```

- [ ] **Step 2: Update `handleSubmit` to check auth**

Replace the existing `handleSubmit` body with the auth-aware version. The only addition is the gate check at the top — everything else stays identical:

```tsx
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Gate: unauthenticated users see an inline signup prompt instead
    if (!user) {
      setGated(true);
      return;
    }

    setLoading(true);
    setResult(null);
    setGated(false);

    try {
      const res = await fetch("/api/ai/mortgage-advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          annualIncome: income ? Number(income) : undefined,
          monthlyDebt: debt ? Number(debt) : undefined,
          downPayment: downPayment ? Number(downPayment) : undefined,
          creditScore: creditScore || undefined,
          homePrice: homePrice ? Number(homePrice) : undefined,
          description: description || undefined,
        }),
      });
      const data = (await res.json()) as AdvisorResult;
      setResult(data);
    } catch {
      /* ignore */
    }
    setLoading(false);
  };
```

- [ ] **Step 3: Add `setGated(false)` to all 6 field onChange handlers**

The five `InputField` components pass `onChange` as a setter directly. Wrap each one to also clear `gated`. Find the grid of InputField components and the select/description inputs, and update all six:

```tsx
          {/* Replace the existing InputField calls and the select/description inputs: */}
          <InputField label="Annual Income" value={income} onChange={(v) => { setIncome(v); setGated(false); }} placeholder="75000" prefix="$" type="number" />
          <InputField label="Monthly Debt Payments" value={debt} onChange={(v) => { setDebt(v); setGated(false); }} placeholder="500" prefix="$" type="number" />
          <InputField label="Down Payment Available" value={downPayment} onChange={(v) => { setDownPayment(v); setGated(false); }} placeholder="20000" prefix="$" type="number" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Credit Score Range</label>
            <select
              value={creditScore}
              onChange={(e) => { setCreditScore(e.target.value); setGated(false); }}
              className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors"
            >
              <option value="">Select range</option>
              <option value="760+">Excellent (760+)</option>
              <option value="700-759">Good (700-759)</option>
              <option value="660-699">Fair (660-699)</option>
              <option value="620-659">Below Average (620-659)</option>
              <option value="below 620">Poor (below 620)</option>
            </select>
          </div>
          <InputField label="Target Home Price (optional)" value={homePrice} onChange={(v) => { setHomePrice(v); setGated(false); }} placeholder="350000" prefix="$" type="number" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Additional Details</label>
            <input
              value={description}
              onChange={(e) => { setDescription(e.target.value); setGated(false); }}
              placeholder="First-time buyer, VA eligible, etc."
              className="w-full h-11 px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-navy-600 transition-colors"
            />
          </div>
```

- [ ] **Step 4: Add the auth nudge banner above the form**

The auth nudge is a small inline banner rendered at the top of the returned JSX, just before the `<form>`. Add it inside the outer `<div>`, before the `<form onSubmit={handleSubmit} ...>` opening tag:

```tsx
      {!user && (
        <div className="flex items-center gap-3 bg-navy-50 border border-navy-100 rounded-xl px-4 py-3 mb-5 text-sm">
          <svg className="h-4 w-4 text-navy-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-slate-600">
            A free account is required to generate AI scenarios.{" "}
            <Link href="/register" className="font-medium text-navy-700 underline underline-offset-2 hover:text-crimson-600 transition-colors">
              Sign up free
            </Link>{" "}
            — takes less than a minute.
          </span>
        </div>
      )}
```

Add `import Link from "next/link";` at the top of the file (after `"use client";`).

- [ ] **Step 5: Add the gate panel where results appear**

After the closing `</form>` tag and before `{result?.scenarios && ...}`, add the gate panel:

```tsx
      {gated && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-sm">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-navy-50 mb-4">
            <svg className="h-6 w-6 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="font-serif text-xl font-bold text-navy-700 mb-2">
            Your scenarios are ready to generate
          </h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6 leading-relaxed">
            Create a free account to unlock your personalized AI mortgage scenarios — it takes less
            than a minute.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="px-6 py-3 bg-navy-600 text-white font-semibold rounded-xl hover:bg-navy-700 transition-colors text-sm"
            >
              Create Free Account
            </Link>
            <Link
              href="/login"
              className="px-6 py-3 bg-white text-navy-700 font-semibold rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-sm"
            >
              Log In
            </Link>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            Your details above are saved — just sign in and submit again.
          </p>
        </div>
      )}
```

- [ ] **Step 6: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx
git commit -m "feat: add auth gate to AI mortgage advisor — inline signup prompt for unauthenticated users"
```

---

## Task 5: Fix Error State and Add Loading Skeleton

**Files:**
- Modify: `src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx`

- [ ] **Step 1: Add `error` state**

Inside `MortgageAdvisor()`, after the existing state declarations, add:

```tsx
  const [error, setError] = useState<string | null>(null);
```

- [ ] **Step 2: Fix the silent `catch` block**

Replace the silent `catch { /* ignore */ }` in `handleSubmit` with:

```tsx
    } catch {
      setError("Something went wrong generating your scenarios. Please try again.");
    }
```

Also clear the error at the start of each submit attempt. In `handleSubmit`, add `setError(null);` immediately after `setResult(null);`:

```tsx
    setLoading(true);
    setResult(null);
    setError(null);
```

- [ ] **Step 3: Render the error state**

After the submit button closing tag (`</button>`), add the error message:

```tsx
        {error && (
          <p className="mt-3 text-sm text-crimson-600 text-center">{error}</p>
        )}
```

- [ ] **Step 4: Add loading skeleton**

The skeleton renders three placeholder cards while `loading === true` and `result` is null. Add this immediately after `{result?.scenarios && ( ... )}` closing block, before the disclaimer text:

```tsx
      {loading && !result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-pulse">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-slate-100 bg-slate-50 p-5 space-y-3">
              <div className="h-3 w-16 bg-slate-200 rounded-full" />
              <div className="h-4 w-3/4 bg-slate-200 rounded-full" />
              <div className="space-y-2 pt-2">
                <div className="h-3 w-full bg-slate-100 rounded-full" />
                <div className="h-3 w-5/6 bg-slate-100 rounded-full" />
                <div className="h-3 w-4/6 bg-slate-100 rounded-full" />
              </div>
              <div className="pt-3 border-t border-slate-100">
                <div className="h-6 w-1/2 bg-slate-200 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      )}
```

- [ ] **Step 5: Type-check**

```bash
npm run type-check
```

Expected: no errors.

- [ ] **Step 6: Lint**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/app/(marketing)/mortgage-calculator/mortgage-advisor.tsx
git commit -m "fix: add error state and loading skeleton to mortgage advisor"
```

---

## Task 6: Visual QA

**Files:** None — verification only.

- [ ] **Step 1: Check if dev server is already running**

```bash
# Check for an existing Next.js process on port 3000
netstat -ano | findstr :3000
```

If a process is found, use it. If not, start the dev server:

```bash
npm run dev
```

- [ ] **Step 2: Open the page and verify the hero**

Navigate to `http://localhost:3000/mortgage-calculator`.

Check:
- Dark navy gradient hero renders
- Grid overlay and crimson glow orb visible
- Breadcrumb shows "Home → Mortgage Calculator"
- "For Buyers" eyebrow in crimson
- Headline "Know Your Numbers Before You Shop" in white serif
- 3-step "How It Works" cards visible (01, 02, 03)

- [ ] **Step 3: Verify the Quick Calculator section**

Scroll to the Quick Calculator section. Check:
- White background section with "Instant Estimate" eyebrow
- `MortgageCalculator` widget renders, sliders work, payment updates live
- Card is centered and not stretching to full width on desktop

- [ ] **Step 4: Verify the AI Advisor section (unauthenticated)**

Ensure you are **not** logged in (open in incognito if needed). Scroll to the AI Advisor section. Check:
- `bg-cream-50` background (off-white, not stark white)
- "AI-Powered" eyebrow + "Get Personalized Scenarios" heading visible
- Auth nudge banner visible above the form (lock icon + "A free account is required…")
- Fill out one or more fields and click "Get My Scenarios"
- Gate panel appears: lock icon, "Your scenarios are ready to generate", two buttons
- Modify a form field — gate panel dismisses
- API was **not** called (verify in browser DevTools Network tab — no request to `/api/ai/mortgage-advisor`)

- [ ] **Step 5: Verify the AI Advisor section (authenticated)**

Log in with a valid account. Navigate back to `/mortgage-calculator`. Check:
- Auth nudge banner is **not** shown
- Fill out the form and submit
- Loading skeleton shows 3 shimmering cards
- Results render correctly (Conservative / Moderate / Stretch scenarios)
- "Get Pre-Approved" CTA link appears below results

- [ ] **Step 6: Verify the error state**

With a logged-in session, temporarily break the API by submitting with network offline (DevTools → Network → Offline). Submit the form. Check:
- Error message "Something went wrong generating your scenarios. Please try again." appears below the submit button
- Submitting again clears the error and retries

- [ ] **Step 7: Verify the CTA Banner**

Scroll to the bottom of the page. Check:
- Navy gradient `CtaBanner` renders
- "Get Pre-Approved Today" heading visible
- "Get Pre-Approved" and "Find an Agent" buttons link correctly

- [ ] **Step 8: Verify mobile layout**

Resize browser to 375px width. Check:
- Hero How It Works cards stack vertically (not overflow)
- Form fields stack to single column
- Gate panel buttons stack vertically
- No horizontal scroll

- [ ] **Step 9: Final commit (if any visual tweaks were needed)**

```bash
git add -p
git commit -m "fix: visual QA tweaks for mortgage calculator page"
```

If no tweaks were needed, skip this step.

---

## Done

Both files modified, all features working:
- ✅ Rich hero with benefit copy and 3-step How It Works
- ✅ Quick Calculator (open to all)
- ✅ AI Advisor (auth-gated, inline gate on unauthenticated submit)
- ✅ Error state (was silent before)
- ✅ Loading skeleton
- ✅ CTA Banner
