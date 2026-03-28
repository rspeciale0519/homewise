# Vendor & Partner Monetization Model

> **Status:** Future phase — saved for reference. Not being built yet.
> **Date:** 2026-03-28

## Overview

Four revenue channels targeting service providers who want access to Homewise's agent network and consumer traffic. This supplements agent subscription revenue.

---

## Channel 1: Preferred Vendor Directory

A public-facing section where buyers, sellers, and agents browse vetted service providers.

### Vendor Categories
- Mortgage lenders
- Home inspectors
- Title companies
- General contractors
- Home stagers
- Real estate photographers
- Moving companies
- Insurance agents
- Real estate attorneys
- Cleaning services

### Vendor Listing Tiers

| Feature | Basic ($99/mo) | Featured ($249/mo) | Exclusive ($499/mo) |
|---|---|---|---|
| Directory profile page | Yes | Yes | Yes |
| Logo + description | Yes | Yes | Yes |
| Contact info visible | Yes | Yes | Yes |
| Highlighted in search results | No | Yes | Yes |
| Featured on property pages | No | Category rotation | Always shown |
| Agent recommendation badge | No | No | Yes (1 per category per county) |
| Monthly analytics report | Basic views | Full engagement | Full + lead attribution |

### Exclusivity Model
- **Exclusive tier** is limited to 1 vendor per category per county (Orange, Seminole, Osceola, Volusia, Lake)
- This creates scarcity and justifies premium pricing
- Exclusive vendors get the "Recommended by Home Wise" badge

---

## Channel 2: Lead Referral Fees

When the app connects a consumer or agent with a vendor, the vendor pays a per-referral fee.

### Fee Structure
| Vendor Category | Per-Referral Fee | Rationale |
|---|---|---|
| Mortgage lenders | $50-75 | Highest deal value |
| Title companies | $35-50 | Medium deal value |
| Home inspectors | $25-35 | Lower deal value, high volume |
| Contractors | $25-50 | Varies by project size |
| Photographers | $25 | Standard booking |
| Stagers | $35-50 | Higher-value service |
| Insurance agents | $25-35 | Recurring revenue for them |
| Movers | $25 | Standard booking |

### Tracking Mechanism
- Referral clicks tracked from directory profile → vendor website/phone
- Form fill referrals (consumer fills contact form routed to vendor)
- Closed-deal attribution (vendor reports back on conversion)
- Vendors can set a monthly referral budget cap to control spend

---

## Channel 3: Sponsored Placements

### Placement Locations
1. **Property page sidebar** — Vendor ads on listing detail pages
   - Lender pre-qualification CTA
   - Inspector booking widget
   - Insurance quote CTA
2. **Search results** — Sponsored vendor cards interspersed with property listings
3. **Property alert emails** — Vendor sponsorship in footer/sidebar of alert emails
4. **Mortgage calculator page** — Lender sponsorship (high-intent traffic)
5. **Buyer/seller guide pages** — Contextual vendor placement

### Pricing Models
- **CPM** (cost per 1,000 impressions): $15-50 depending on placement
- **Flat monthly fee**: $199-499/mo for guaranteed placement
- **CPC** (cost per click): $2-10 depending on vendor category

---

## Channel 4: Affiliate Partnerships

For vendors who prefer commission-based compensation over flat fees.

### Structure
- Custom tracking links generated per affiliate partner
- Commission tracked when a consumer uses the partner's service
- Monthly affiliate reports for reconciliation
- Minimum payout threshold: $100

### Example Commission Rates
| Partner Type | Commission Model | Example |
|---|---|---|
| Mortgage lender | % of loan amount | 0.15-0.25% of loan = $450-750 on $300K loan |
| Title company | Flat per closing | $100-200 per closing |
| Home warranty | Flat per policy | $50-75 per policy sold |
| Insurance | Flat per policy + renewal | $25-50 per new policy |
| Moving company | % of invoice | 10-15% of moving cost |

### Compliance Notes
- All affiliate relationships must be disclosed per RESPA guidelines
- Mortgage referral fees are subject to RESPA Section 8 restrictions
- Consult legal counsel before implementing lender referral fees
- Florida-specific real estate commission sharing rules apply

---

## Revenue Projections (Conservative)

### Directory Listings (Year 1)
- 20 Basic vendors × $99/mo = $23,760/yr
- 10 Featured vendors × $249/mo = $29,880/yr
- 5 Exclusive vendors × $499/mo = $29,940/yr
- **Subtotal: ~$83,580/yr**

### Lead Referrals (Year 1)
- ~500 referrals/mo × $35 avg fee = $17,500/mo
- **Subtotal: ~$210,000/yr**

### Sponsored Placements (Year 1)
- 10 sponsors × $300/mo avg = $3,000/mo
- **Subtotal: ~$36,000/yr**

### Affiliate Commissions (Year 1)
- 100 closed transactions/mo × $150 avg commission = $15,000/mo
- **Subtotal: ~$180,000/yr**

### Total Vendor Revenue Estimate: ~$509,580/yr

*These are rough estimates assuming moderate adoption. Actual numbers depend on traffic volume, agent count, and vendor sales effort.*

---

## Implementation Priority
1. Preferred Vendor Directory (simplest to build, immediate revenue)
2. Lead Referral Tracking (highest ROI per vendor)
3. Affiliate Partnership Tracking (highest per-transaction revenue)
4. Sponsored Placements (requires ad serving infrastructure)

---

## Technical Requirements (High-Level)
- Vendor self-service portal (profile management, analytics dashboard)
- Stripe Connect for vendor billing (subscriptions + metered referral fees)
- Referral tracking system (click tracking, attribution, reporting)
- Ad placement engine for sponsored content
- Affiliate link generation and conversion tracking
- Vendor analytics dashboard (impressions, clicks, referrals, ROI)
- Admin tools for vendor approval, tier management, reporting
