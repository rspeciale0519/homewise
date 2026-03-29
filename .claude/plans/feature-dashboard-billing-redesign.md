# Feature: Dashboard Billing Redesign

## Context
Redesign `/dashboard/billing` from a read-only status page into a full self-service billing hub with 4 tabbed sections: My Plan, Payment Methods, Invoices, and Settings. All billing management happens in-app — agents never leave to Stripe Portal.

## Spec
`docs/superpowers/specs/2026-03-28-dashboard-billing-redesign.md`

## Implementation Plan (7 Tasks)

### Task 1: New Billing API Routes — Payment Methods & Setup Intent
**Files:**
- Create: `src/app/api/billing/payment-methods/route.ts` (GET list, POST attach)
- Create: `src/app/api/billing/payment-methods/[id]/route.ts` (DELETE detach)
- Create: `src/app/api/billing/payment-methods/[id]/default/route.ts` (PUT set default)
- Create: `src/app/api/billing/setup-intent/route.ts` (POST create SetupIntent for Stripe Elements)

All routes use `requireAuthApi()` + agent lookup pattern. Payment method routes call Stripe's `customers.listPaymentMethods()`, `paymentMethods.attach()`, `paymentMethods.detach()`, `customers.update({ invoice_settings: { default_payment_method } })`. SetupIntent route creates a `stripe.setupIntents.create()` for secure client-side card/ACH collection.

### Task 2: New Billing API Routes — Invoices & Subscription Management
**Files:**
- Create: `src/app/api/billing/invoices/route.ts` (GET list invoices)
- Create: `src/app/api/billing/invoices/[id]/pay/route.ts` (POST retry payment)
- Create: `src/app/api/billing/subscription/modify/route.ts` (PUT add/remove bundles with proration)
- Create: `src/app/api/billing/subscription/interval/route.ts` (PUT switch monthly↔annual)
- Create: `src/app/api/billing/subscription/cancel/route.ts` (POST cancel at period end)

Modify route uses `stripe.subscriptions.update()` with `items` array and `proration_behavior: 'always_invoice'`. Interval route creates new prices if needed. Cancel route uses `stripe.subscriptions.update({ cancel_at_period_end: true })`.

### Task 3: Dashboard Tabs Container & Plan Summary Bar
**Files:**
- Rewrite: `src/components/billing/billing-dashboard.tsx` — New tabbed layout with plan summary bar
- Create: `src/components/billing/dashboard-tabs.tsx` — Tab container managing active tab state
- Modify: `src/app/dashboard/billing/page.tsx` — Pass entitlements and bundle configs to client

Plan summary bar: dark navy, shows active status dot, current bundles, next billing date, total cost. 4 tabs: My Plan, Payment Methods, Invoices, Settings. Tab state managed via URL hash or local state.

### Task 4: My Plan Tab — Bundle Management
**Files:**
- Create: `src/components/billing/plan-manager.tsx` — My Plan tab with Bundles/Build Your Own toggle
- Create: `src/components/billing/plan-bundle-card.tsx` — Active (green) and inactive (dashed) bundle cards

Reuses `FeaturePicker` from pricing page for Build Your Own mode. Bundle cards show active state with green border/badge and "Remove Bundle" button, or inactive with dashed border and "+ Add to Plan". Confirmation dialogs for add (shows prorated cost) and remove (shows end date). Calls `/api/billing/subscription/modify` on confirm.

### Task 5: Payment Methods Tab
**Files:**
- Create: `src/components/billing/payment-methods-tab.tsx` — Full payment method management

Lists saved methods from `/api/billing/payment-methods`. Each method shows brand/type, last 4, expiry, default badge. Actions: set default, remove (with confirmation). "Add Payment Method" button renders Stripe Elements via `@stripe/react-stripe-js` — need to install `@stripe/stripe-js` and `@stripe/react-stripe-js`. Creates SetupIntent via `/api/billing/setup-intent`, then uses `PaymentElement` for card/ACH/wallet input.

**New dependency:** `npm install @stripe/stripe-js @stripe/react-stripe-js`

### Task 6: Invoices Tab
**Files:**
- Create: `src/components/billing/invoices-tab.tsx` — Invoice history and upcoming invoice

Fetches from `/api/billing/invoices`. Shows upcoming invoice card with line items and estimated total. Table of past invoices with date, number, amount, status badge (Paid/Pending/Failed), payment method, and Download PDF link (from `invoice.invoice_pdf`). Failed invoices show "Retry Payment" button calling `/api/billing/invoices/[id]/pay`.

### Task 7: Settings Tab & Cancel Flow
**Files:**
- Create: `src/components/billing/settings-tab.tsx` — Billing interval switch, cancel, email prefs
- Create: `src/components/billing/cancel-flow.tsx` — Multi-step cancellation dialog

Settings shows current billing interval with switch button. Cancel subscription button triggers 4-step flow: reason → what you'll lose → pause offer → final confirm. Calls `/api/billing/subscription/cancel` on confirm. Email preferences toggles (stored in agent profile or billing settings).

## Verification
- Add a bundle from My Plan tab → verify Stripe charge + subscription update
- Remove a bundle → verify access continues until period end
- Add card via Stripe Elements → verify it appears in list
- Set payment method as default → verify next charge uses it
- View invoices → verify they match Stripe dashboard
- Switch billing interval → verify proration
- Cancel subscription → verify it cancels at period end
- Test on mobile viewport for responsive behavior
