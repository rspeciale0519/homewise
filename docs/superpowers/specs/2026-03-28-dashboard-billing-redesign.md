# Dashboard Billing Page Redesign — Design Spec

> **Date:** 2026-03-28
> **Status:** Approved for implementation planning
> **Scope:** Redesign `/dashboard/billing` from a read-only status page into a full self-service billing management hub with 4 tabbed sections

---

## 1. Problem Statement

The current `/dashboard/billing` page is a read-only view showing subscription status and a "Manage Subscription" button that redirects to Stripe's Customer Portal. Agents must leave the app to manage their plan, payment methods, or view invoices. The goal is to bring all billing management in-app so agents never need to leave the Homewise dashboard.

### Goals
- Let agents add/remove bundles and switch between Bundles and Build Your Own mode directly in the dashboard
- Full in-app payment method management (cards, ACH, Apple Pay, Google Pay)
- In-app invoice history with download links
- Subscription settings (billing interval, cancellation, email preferences)
- All changes happen instantly with proration (Stripe's default behavior)

---

## 2. Layout Structure

### Plan Summary Bar (Persistent, top of page)
A dark navy bar showing at-a-glance billing status:
- **Status indicator**: Green dot + "Active Plan" (or amber for trialing, red for past due)
- **Active items**: "Membership + AI Power Tools + Growth Engine"
- **Next billing date**: "Next billing: Apr 1, 2026"
- **Total**: "$148/mo + $499/yr membership"

### 4 Horizontal Tabs
Tabs below the summary bar, each a focused management view:

1. **My Plan** — Add/remove bundles, switch to Build Your Own
2. **Payment Methods** — View, add, remove cards and bank accounts
3. **Invoices** — Invoice history, download PDFs, retry failed payments
4. **Settings** — Billing interval, cancellation, email preferences

---

## 3. My Plan Tab

### Bundles / Build Your Own Toggle
Same toggle as the public pricing page. Switching modes shows a confirmation dialog explaining that switching clears current selections.

### Bundles Mode (default if agent has bundles)
Three bundle cards in a row:

**Active bundle card:**
- Green border (`border-emerald-500`) + light green background (`bg-emerald-50`)
- Green "ACTIVE" badge top-right
- Bundle icon, name, price, billing interval
- Feature list with checkmarks
- Red outline "Remove Bundle" button
- Clicking "Remove" shows confirmation: "This bundle will remain active until your next billing date (Apr 1). Remove?"

**Inactive bundle card:**
- Dashed gray border (`border-dashed border-slate-300`)
- White background
- Same info but grayed slightly
- "+ Add to Plan" button
- Clicking "Add" shows confirmation with prorated cost: "AI Power Tools will be added immediately. You'll be charged $XX.XX (prorated) for the remainder of this billing cycle. Add?"

### Build Your Own Mode
Same feature picker as the pricing page — 3 columns (AI, Marketing, Growth) with per-feature checkboxes and prices. Features already active show as checked. Each category shows a "Bundle & save" nudge.

### Proration Notice
Blue info banner at bottom: "Changes take effect immediately. Adding charges a prorated amount. Removing continues access until your next billing date."

---

## 4. Payment Methods Tab

### Saved Payment Methods
List of all saved payment methods, each showing:
- **Card**: Brand icon (Visa/MC/Amex) + "•••• 4242" + "Expires 12/28"
- **Bank account**: Bank icon + "Chase •••• 6789" + "Checking"
- **Digital wallet**: Apple Pay / Google Pay badge
- **Default badge**: Blue "DEFAULT" pill on the primary payment method
- **Actions**: "Set as Default" link (on non-default) + "Remove" link (with confirmation)

### Add Payment Method
"+ Add Payment Method" button opens a Stripe Elements embedded form supporting:
- Credit/debit card entry
- ACH bank account linking (Plaid instant verification or micro-deposits)
- Apple Pay / Google Pay (when available in the browser)

After adding, option to "Set as default for autopay".

### Autopay Status
Banner at top of tab: "Autopay is ON — your default payment method will be charged automatically on each billing date." or "Autopay is OFF — you'll receive an invoice to pay manually."

---

## 5. Invoices Tab

### Upcoming Invoice
Card at top showing:
- Next billing date
- Line item breakdown: Membership ($499/yr), AI Power Tools ($42/mo), Growth Engine ($83/mo)
- Estimated total

### Invoice History Table
| Date | Invoice # | Amount | Status | Payment Method | Actions |
|------|-----------|--------|--------|---------------|---------|
| Mar 1, 2026 | INV-2026-003 | $148.00 | Paid | Visa •••• 4242 | Download PDF |
| Feb 1, 2026 | INV-2026-002 | $148.00 | Paid | Visa •••• 4242 | Download PDF |
| Jan 1, 2026 | INV-2026-001 | $647.00 | Paid | Visa •••• 4242 | Download PDF |

**Status badges:**
- Green "Paid" for successful payments
- Yellow "Pending" for processing
- Red "Failed" with a "Retry Payment" button

**Download PDF:** Links to Stripe's hosted invoice PDF.

---

## 6. Settings Tab

### Billing Interval
- Current interval displayed (Monthly or Annual)
- "Switch to Annual (save 15%)" or "Switch to Monthly" button
- Confirmation dialog explaining proration and when the change takes effect

### Cancel Subscription
Red "Cancel Subscription" button that triggers a multi-step flow:
1. **Step 1**: "Why are you canceling?" — optional dropdown (too expensive, not using, switching brokerages, other)
2. **Step 2**: "Here's what you'll lose" — list of active bundles and features that will be deactivated
3. **Step 3**: "Would you prefer to pause?" — offer to pause for 1-3 months instead
4. **Step 4**: Final confirmation — "Your subscription will be canceled at the end of your current billing period (Apr 1, 2026). You'll retain access until then."

### Email Preferences
Toggle switches for:
- Invoice emails (when a new invoice is generated)
- Payment receipt emails (when payment succeeds)
- Payment reminder emails (before autopay charges)
- Failed payment notifications

---

## 7. API Routes Needed

### New Routes
- `GET /api/billing/payment-methods` — List saved payment methods via `stripe.customers.listPaymentMethods()`
- `POST /api/billing/payment-methods` — Attach a new payment method to the customer
- `DELETE /api/billing/payment-methods/[id]` — Detach a payment method
- `PUT /api/billing/payment-methods/[id]/default` — Set as default payment method
- `GET /api/billing/invoices` — List invoices via `stripe.invoices.list()`
- `POST /api/billing/invoices/[id]/pay` — Retry a failed invoice payment
- `PUT /api/billing/subscription/modify` — Add/remove bundles (modify subscription items with proration)
- `PUT /api/billing/subscription/interval` — Switch billing interval
- `POST /api/billing/subscription/cancel` — Cancel subscription at period end
- `POST /api/billing/setup-intent` — Create a Stripe SetupIntent for securely adding payment methods via Stripe Elements

### Existing Routes (reused)
- `GET /api/billing/subscription` — Current subscription status (already built)
- `POST /api/billing/portal` — Stripe portal fallback (already built)

---

## 8. Files to Create/Modify

### New Files
- `src/components/billing/dashboard-tabs.tsx` — Tab container with My Plan, Payment Methods, Invoices, Settings
- `src/components/billing/plan-manager.tsx` — My Plan tab content (bundle cards, Build Your Own toggle)
- `src/components/billing/plan-bundle-card.tsx` — Active/inactive bundle card for dashboard
- `src/components/billing/payment-methods-tab.tsx` — Payment methods list + add form
- `src/components/billing/invoices-tab.tsx` — Invoice table + upcoming invoice
- `src/components/billing/settings-tab.tsx` — Billing interval, cancel flow, email prefs
- `src/components/billing/cancel-flow.tsx` — Multi-step cancellation dialog
- `src/app/api/billing/payment-methods/route.ts` — Payment method CRUD
- `src/app/api/billing/payment-methods/[id]/route.ts` — Single payment method actions
- `src/app/api/billing/payment-methods/[id]/default/route.ts` — Set default
- `src/app/api/billing/invoices/route.ts` — Invoice list
- `src/app/api/billing/invoices/[id]/pay/route.ts` — Retry payment
- `src/app/api/billing/subscription/modify/route.ts` — Add/remove bundles
- `src/app/api/billing/subscription/interval/route.ts` — Switch interval
- `src/app/api/billing/subscription/cancel/route.ts` — Cancel
- `src/app/api/billing/setup-intent/route.ts` — Create SetupIntent

### Modified Files
- `src/app/dashboard/billing/page.tsx` — Pass additional data (entitlements, bundles) to client
- `src/components/billing/billing-dashboard.tsx` — Major rewrite to tabbed layout

### Archived Files
- None — existing components are either reused or rewritten in place

---

## 9. Verification Plan

### Functional Testing
1. **My Plan tab**: Add a bundle → verify prorated charge appears in Stripe → verify access granted. Remove a bundle → verify it stays active until period end.
2. **Build Your Own**: Toggle features → verify subscription items update in Stripe.
3. **Payment Methods**: Add card via Stripe Elements → verify it appears in list. Add bank account → verify ACH flow. Set as default → verify next charge uses it. Remove → verify it's detached.
4. **Invoices**: Verify invoice list matches Stripe. Download PDF link works. Retry payment on a failed invoice.
5. **Settings**: Switch billing interval → verify proration. Cancel subscription → verify it cancels at period end. Re-subscribe → verify access restored.
6. **Edge cases**: Agent with no subscription sees empty state with CTA to pricing page. Agent with past-due subscription sees appropriate warnings.
