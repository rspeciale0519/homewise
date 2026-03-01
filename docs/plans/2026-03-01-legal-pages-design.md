# Design: Terms of Service & Privacy Policy Pages

**Date:** 2026-03-01
**Status:** Approved

## Context

Home Wise Realty Group, Inc. (FL License CQ1026984) needs Terms of Service and Privacy Policy pages for homewisefl.com. The site is a Florida real estate brokerage website with MLS property search, user registration (email/password, Google OAuth, magic link), saved searches, property alerts, favorites, contact forms, agent directory, and a mortgage calculator.

## Business Details

- **Legal name:** Home Wise Realty Group, Inc.
- **Address:** 217 N Westmonte Drive #2012, Altamonte Springs, FL 32714
- **License:** CQ1026984 (DBPR)
- **Service areas:** Orange, Seminole, Osceola, Volusia, Lake counties
- **Analytics:** Google Analytics (GA4)
- **Email provider:** Resend
- **Auth/DB:** Supabase
- **Hosting:** Vercel

## Approach

Two separate pages under the `(marketing)` route group:
- `/terms-of-service` — `src/app/(marketing)/terms-of-service/page.tsx`
- `/privacy-policy` — `src/app/(marketing)/privacy-policy/page.tsx`

Footer updated with links to both pages.

## Page Design

- Server components with static content
- Existing site aesthetic (navy/crimson/cream palette, Cormorant Garamond headings, DM Sans body)
- Sticky table-of-contents sidebar on desktop, collapsible on mobile
- Section anchors for deep linking
- "Last Updated" date at top
- Clean legal text layout with generous line height

## Terms of Service Sections

1. **Acceptance of Terms** — clickwrap reference, last updated date
2. **Company Identification & Licensing** — legal name, FL license CQ1026984, FREC/DBPR regulated (Rule 61J2-10.025)
3. **Description of Services** — site is not legal/financial advice, no brokerage relationship created without written agreement (F.S. 475.278)
4. **MLS/IDX Data Disclaimer** — NAR IDX Policy 7.58, personal non-commercial use only, data not guaranteed accurate, no scraping
5. **User Accounts** — 18+ requirement, responsibility for account activity, three login methods
6. **User-Generated Content** — license grant for form submissions, notes, search criteria
7. **Prohibited Uses** — commercial IDX use, scraping, unauthorized access, impersonation
8. **Intellectual Property** — HWRG owns site content, MLS data owned by listing brokers, DMCA notice
9. **Mortgage Calculator Disclaimer** — estimates only, not financial advice, not pre-qualification
10. **Disclaimer of Warranties** — AS IS/AS AVAILABLE, MLS data, calculator, uptime (bold/caps for enforceability)
11. **Limitation of Liability** — cap at $100 or fees paid in 12 months (bold/caps)
12. **Indemnification** — user violations, unauthorized data use, false submissions
13. **Third-Party Links** — no endorsement
14. **Email Communications** — CAN-SPAM compliance, unsubscribe mechanism, physical address
15. **Brokerage Relationship Notice** — F.S. 475.278, three relationship types, no dual agency in FL
16. **Governing Law & Jurisdiction** — Florida law, Seminole County courts, severability
17. **Dispute Resolution** — 30-day informal resolution, binding AAA arbitration, class action waiver, IP/small claims carveouts
18. **Changes to Terms** — 30-day email notice for material changes

## Privacy Policy Sections

1. **Introduction** — scope, effective date, HWRG does not sell personal information
2. **Information Collected** — directly provided (account, forms, searches, notes), automatically collected (IP, browser, cookies, page views), from third parties (Google OAuth, MLS data)
3. **How Information Is Used** — mapped to specific purposes (service delivery, alerts, communication, security)
4. **How Information Is Shared** — Supabase (auth/DB), Google (OAuth + Analytics), Resend (email), Vercel (hosting), agent referrals, legal process
5. **Cookies & Tracking** — strictly necessary (session tokens), analytics (GA4 with opt-out), third-party (Google Maps). Cookie consent banner needed.
6. **Data Retention** — active accounts until deletion, forms 2 years, logs 90 days, email logs 3 years, backups purged 90 days post-deletion
7. **User Rights** — access, correction, deletion (30-day response), opt-out of marketing
8. **California Residents (CCPA)** — right to know, delete, correct, opt-out of sale (HWRG does not sell), 45-day response
9. **Children's Privacy (COPPA)** — not directed to under-13, accounts require 18+, discovery = deletion
10. **Data Security** — HTTPS/TLS, hashed passwords, Supabase RLS, session expiration, FIPA breach notification (30 days)
11. **Third-Party Service Links** — privacy policy URLs for Google, Supabase, Vercel, Resend
12. **International Transfers** — U.S.-based, no active EU marketing
13. **Privacy Inquiries** — privacy@homewisefl.com, response commitments, regulator complaint links
14. **Changes to Policy** — 30-day email notice

## Files to Create/Modify

**New:**
- `src/app/(marketing)/terms-of-service/page.tsx`
- `src/app/(marketing)/privacy-policy/page.tsx`

**Modified:**
- `src/components/layout/footer.tsx` — add TOS and Privacy Policy links in bottom bar

## Legal Disclaimers

These pages are drafted based on thorough research of Florida law, federal regulations, and industry standards. However, they should be reviewed by a licensed Florida attorney before going live. Key items requiring attorney review:
- Brokerage relationship disclosure language (F.S. 475.278)
- IDX disclaimer exact wording per Stellar MLS / ORRA rules
- Arbitration clause enforceability
- TCPA compliance if agents will text/call leads
