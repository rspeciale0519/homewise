# Terms of Service & Privacy Policy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add legally compliant Terms of Service and Privacy Policy pages for Home Wise Realty Group, Inc.

**Architecture:** Two static server-component pages under the `(marketing)` route group, following existing page patterns (createMetadata, Container, Cormorant Garamond headings, DM Sans body). A shared `LegalPageLayout` component provides the table-of-contents sidebar and consistent styling. Footer updated with links.

**Tech Stack:** Next.js App Router, Tailwind CSS, existing UI components

**Design Doc:** `docs/plans/2026-03-01-legal-pages-design.md`

---

## Phase 1: Shared Layout Component & Terms of Service Page

### Task 1: Create the shared LegalPageLayout component

**Files:**
- Create: `src/components/legal/legal-page-layout.tsx`

**Step 1: Create the component**

This is a server component that accepts a title, last-updated date, and an array of sections (each with an id, title, and React node content). It renders:
- A hero banner with the page title and last-updated date
- Desktop: sticky table-of-contents sidebar (left) + content (right)
- Mobile: collapsible TOC at top
- Section anchors for deep linking
- Back-to-top link at bottom

```tsx
import { Container } from "@/components/ui/container";

interface LegalSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

export function LegalPageLayout({ title, lastUpdated, sections }: LegalPageLayoutProps) {
  // Hero banner with title + date
  // Two-column layout: sticky TOC sidebar + scrolling content
  // Mobile: details/summary collapsible TOC
  // Each section wrapped in <section id={section.id}>
  // Back to top link at bottom
}
```

Use the existing site aesthetic:
- `font-serif` (Cormorant Garamond) for headings
- Navy/cream color scheme
- `Container` for max-width
- Smooth scroll behavior via `scroll-smooth` on the wrapper

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/legal/legal-page-layout.tsx
git commit -m "feat: add shared LegalPageLayout component for legal pages"
```

---

### Task 2: Create the Terms of Service page

**Files:**
- Create: `src/app/(marketing)/terms-of-service/page.tsx`

**Step 1: Create the page**

Server component using `LegalPageLayout`. Include all 18 sections from the design doc:

1. Acceptance of Terms
2. Company Identification & Licensing — legal name "Home Wise Realty Group, Inc.", FL license CQ1026984, address 217 N Westmonte Drive #2012, Altamonte Springs, FL 32714, regulated by FREC/DBPR
3. Description of Services — not legal/financial/appraisal advice, no brokerage relationship without written agreement (F.S. 475.278)
4. MLS/IDX Data Disclaimer — NAR IDX Policy 7.58 verbatim disclaimer, personal non-commercial use only, no scraping, data not guaranteed
5. User Accounts — 18+ requirement, responsible for activity, three login methods
6. User-Generated Content — license grant for submissions
7. Prohibited Uses — commercial IDX use, scraping, unauthorized access
8. Intellectual Property — HWRG owns site content, MLS data owned by listing brokers, DMCA notice
9. Mortgage Calculator Disclaimer — estimates only, not financial advice
10. Disclaimer of Warranties — AS IS/AS AVAILABLE in bold/caps
11. Limitation of Liability — $100 cap in bold/caps
12. Indemnification
13. Third-Party Links — no endorsement
14. Email Communications — CAN-SPAM compliance, physical address, unsubscribe
15. Brokerage Relationship Notice — F.S. 475.278, three relationship types, no dual agency in FL
16. Governing Law & Jurisdiction — Florida law, Seminole County
17. Dispute Resolution — 30-day informal, AAA arbitration, class action waiver
18. Changes to Terms — 30-day email notice

Export metadata using `createMetadata({ title: "Terms of Service", description: "...", path: "/terms-of-service" })`.

Use `frontend-design` skill for the visual styling — clean legal typography, generous line-height, proper heading hierarchy, styled lists and bold text for key legal provisions.

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(marketing)/terms-of-service/page.tsx
git commit -m "feat: add Terms of Service page with Florida-specific legal content"
```

---

### Task 3: Create the Privacy Policy page

**Files:**
- Create: `src/app/(marketing)/privacy-policy/page.tsx`

**Step 1: Create the page**

Server component using `LegalPageLayout`. Include all 14 sections from the design doc:

1. Introduction — scope, effective date, HWRG does not sell personal information
2. Information Collected — directly provided (account, forms, searches, notes), automatically collected (IP, browser, cookies, GA4), from third parties (Google OAuth, MLS)
3. How Information Is Used — service delivery, alerts, communication, security, analytics
4. How Information Is Shared — Supabase (auth/DB, SOC 2 Type II), Google (OAuth + GA4), Resend (email delivery), Vercel (hosting), agent referrals, legal process
5. Cookies & Tracking — strictly necessary (session tokens), analytics (GA4 with opt-out link), third-party (Google Maps)
6. Data Retention — accounts until deletion, forms 2 years, logs 90 days, email logs 3 years, backups 90 days post-deletion
7. User Rights — access, correction, deletion (30-day response), opt-out of marketing
8. California Residents (CCPA) — right to know, delete, correct, opt-out of sale (HWRG does not sell), 45-day response
9. Children's Privacy (COPPA) — not directed to under-13, accounts 18+, discovery = deletion
10. Data Security — HTTPS/TLS, hashed passwords, Supabase RLS, FIPA breach notification (30 days, FL Dept of Legal Affairs if 500+)
11. Third-Party Service Links — Google, Supabase, Vercel, Resend privacy policy URLs
12. International Data Transfers — U.S.-based
13. Privacy Inquiries — privacy@homewisefl.com, FL AG + FTC complaint links
14. Changes to Policy — 30-day email notice

Export metadata using `createMetadata({ title: "Privacy Policy", description: "...", path: "/privacy-policy" })`.

Use `frontend-design` skill for visual styling consistent with the TOS page. Include a data collection summary table in Section 2 for clarity.

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/(marketing)/privacy-policy/page.tsx
git commit -m "feat: add Privacy Policy page with FIPA, CCPA, and COPPA compliance"
```

---

## Phase 2: Footer Update & Build Verification

### Task 4: Update footer with legal links

**Files:**
- Modify: `src/components/layout/footer.tsx:146-163` (bottom bar section)

**Step 1: Add legal links to the footer bottom bar**

In the bottom bar between the copyright line and the REALTOR/MLS badges, add Terms of Service and Privacy Policy links:

```tsx
<div className="flex items-center gap-4 flex-wrap justify-center">
  <Link href="/terms-of-service" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
  <span className="text-navy-500">·</span>
  <Link href="/privacy-policy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
</div>
```

Place this as a new row or inline with the existing copyright text, maintaining the existing style.

**Step 2: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/components/layout/footer.tsx
git commit -m "feat: add Terms of Service and Privacy Policy links to footer"
```

---

### Task 5: Full build verification

**Step 1: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run lint**

Run: `npm run lint`
Expected: No errors

**Step 3: Run build**

Run: `npm run build`
Expected: Successful build, `/terms-of-service` and `/privacy-policy` appear as static pages

**Step 4: Visual verification**

Start dev server and check both pages at:
- `http://localhost:3000/terms-of-service`
- `http://localhost:3000/privacy-policy`
- Footer links work from any page
- TOC navigation works
- Mobile responsive (375px, 768px)
- Section anchors work (e.g., `/privacy-policy#cookies-tracking`)

---

## File Inventory

**New files (3):**
- `src/components/legal/legal-page-layout.tsx`
- `src/app/(marketing)/terms-of-service/page.tsx`
- `src/app/(marketing)/privacy-policy/page.tsx`

**Modified files (1):**
- `src/components/layout/footer.tsx`

## Notes

- All legal content is based on thorough research but should be reviewed by a licensed Florida attorney before production use
- The `frontend-design` skill should be used for the page styling to maintain the site's distinctive aesthetic
- Keep each page file under 450 LOC (per project rules) — if content is too long, extract section content into separate constant files
