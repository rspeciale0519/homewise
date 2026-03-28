# Agent Subscription & Billing System — Design Spec

> **Date:** 2026-03-28
> **Status:** Approved for implementation planning
> **Scope:** Agent subscription billing (Phase 1). Vendor monetization is documented separately in `docs/ideas/vendor-monetization-model.md` for a future phase.

---

## 1. Problem Statement

Home Wise Realty Group's 186+ agents currently pay annual brokerage membership fees via phone calls or physical office visits. There is no digital billing, no recurring payment infrastructure, and no way to monetize the app's premium features (AI tools, marketing automation, advanced CRM). All app features are currently free and ungated.

### Goals
- Replace manual membership fee collection with automated, website-based billing through Stripe
- Introduce feature bundles and à la carte add-ons as additional revenue streams beyond the base membership
- Give agents self-service billing management (pay online, set up autopay, manage payment methods)
- Give admins full control to manage agent billing, process payments on agents' behalf, and configure bundles/pricing without code changes
- Gate premium features behind paid bundles to drive upgrade revenue

---

## 2. Monetization Model

### 2.1 Base Layer: Annual Brokerage Membership

Every agent must pay the annual membership fee to remain affiliated with Home Wise Realty Group. This is the existing fee, moved to Stripe billing.

- **Billing cycle:** Annual only
- **Required:** Cannot be removed — if unpaid, agent loses all app access
- **Replaces:** Current phone/in-person payment process

### 2.2 Feature Bundles (Stackable)

Three curated bundles grouped by agent workflow. Agents can subscribe to any combination (0, 1, 2, or all 3). Bundles are billed monthly or annually (annual = ~15% discount).

#### AI Power Tools (~$49/mo · ~$499/yr)
For agents who want AI assistance in their daily work.

| Feature | Included |
|---|---|
| AI CMA Reports | Unlimited |
| AI Lead Scoring | Advanced (10-point scale) |
| AI Listing Descriptions | Unlimited |
| AI Social Post Creator | Unlimited |
| AI Meeting Prep | Unlimited |
| AI Follow-Up Drafts | Unlimited |
| AI Email Content | Unlimited |

#### Marketing Suite (~$69/mo · ~$699/yr)
For agents focused on nurturing leads and client outreach.

| Feature | Included |
|---|---|
| Campaign Builder | Full access |
| Drip Sequences | Unlimited |
| A/B Subject Line Testing | Yes |
| Broadcast Emails | Unlimited |
| Email Analytics (opens, clicks, bounces) | Full |
| Behavioral Trigger Automation | Yes |
| SMS Campaigns | Yes (Twilio) |

#### Growth Engine (~$99/mo · ~$999/yr)
For top producers scaling their business.

| Feature | Included |
|---|---|
| Priority Lead Routing | Yes |
| Advanced Lead Scoring Rules | Custom rules |
| Team Dashboards | Yes |
| Unlimited Transaction Tracking | Yes |
| Performance Analytics & Export | Full |
| API Access | Yes |
| White-Label CMA Reports | Yes |

### 2.3 À La Carte Add-Ons

Individual premium capabilities for agents who want specific features without a full bundle. Monthly billing only.

| Add-On | Price | Description |
|---|---|---|
| Extra AI Credits Pack | ~$19/mo | Additional AI usage for agents on free tier or who exceed limits |
| Advanced Training Library | ~$15/mo | Full training content library beyond required courses |
| Property Alerts (50 pack) | ~$9/mo | 50 additional active property alerts |
| White-Label CMA Reports | ~$29/mo | Branded CMA reports without purchasing Growth Engine |

### 2.4 Free Tier (No Bundle)

Agents who pay only the base membership get limited access:

| Feature | Free Limit |
|---|---|
| CRM Contacts | 50 |
| AI CMA Reports | 5/month |
| AI Lead Scoring | Basic (3 tiers: hot/warm/cold) |
| AI Content Tools | Listing descriptions only |
| Marketing | Manual emails only (no campaigns/automation) |
| Property Alerts | 3 active |
| Training Hub | Required courses only |
| Transaction Tracking | 3 active |
| Lead Routing | Manual assignment only |
| Analytics | Basic activity feed |

### 2.5 New Agent Trial

New agents receive a 14-day free trial of all three bundles upon joining. After the trial ends, they fall back to whatever bundles they've purchased (or the free tier if none).

### 2.6 Existing Agent Transition

- All current agents receive a migration email with a link to set up Stripe billing
- 30-day grace period: full access maintained while agents transition
- Loyalty discount: first year of any bundle at 20% off for existing agents
- After grace period, features gate based on active subscriptions

---

## 3. Stripe Architecture

### 3.1 Stripe Object Model

```
Stripe Customer (1 per agent)
└── Subscription (1 per agent — single subscription with multiple line items)
    ├── Line Item: Annual Brokerage Membership (required)
    ├── Line Item: AI Power Tools (optional)
    ├── Line Item: Marketing Suite (optional)
    ├── Line Item: Growth Engine (optional)
    └── Line Item: À la carte add-ons (optional, 0 or more)
```

- **One Stripe Customer per agent** — linked to the agent's app user ID
- **One Subscription per agent** — all bundles and add-ons are line items on a single subscription
- **One combined invoice** — agents see a single bill, not separate invoices per bundle
- Each bundle/add-on is a **Stripe Product** with monthly and annual **Price** variants
- The base membership is a separate Product with an annual Price only

### 3.2 Stripe Products to Create

| Product Name | Type | Prices |
|---|---|---|
| Annual Brokerage Membership | Recurring | Annual only |
| AI Power Tools | Recurring | Monthly + Annual |
| Marketing Suite | Recurring | Monthly + Annual |
| Growth Engine | Recurring | Monthly + Annual |
| Extra AI Credits Pack | Recurring | Monthly only |
| Advanced Training Library | Recurring | Monthly only |
| Property Alerts (50 pack) | Recurring | Monthly only |
| White-Label CMA Reports | Recurring | Monthly only |

### 3.3 Payment Methods

Agents can pay via:
- **Credit/debit card** — instant processing
- **ACH bank transfer** — 3-5 business day clearing
  - Instant verification via Plaid (agent logs into bank)
  - Or micro-deposit verification (Stripe sends two small deposits, agent confirms amounts)

Both card and ACH can be saved for autopay or used for one-time payments.

### 3.4 Invoicing & Autopay

- Stripe generates an invoice for each billing cycle
- **Autopay enabled:** Card or bank account on file is charged automatically
- **Autopay disabled:** Agent receives an email notification (configurable, e.g., 7 days before due date) with a hosted invoice link to pay manually through the website
- Failed payments trigger Stripe's dunning system (configurable retry schedule)

### 3.5 Webhook Events

The app listens for Stripe webhook events at `POST /api/webhooks/stripe`:

| Event | App Action |
|---|---|
| `customer.subscription.created` | Activate entitlements for agent |
| `customer.subscription.updated` | Update entitlements (bundle added/removed) |
| `customer.subscription.deleted` | Revoke all entitlements |
| `invoice.payment_succeeded` | Mark subscription current, clear any past-due flags |
| `invoice.payment_failed` | Start grace period countdown, show warning banner |
| `customer.subscription.trial_will_end` | Notify agent their trial is ending in 3 days |
| `payment_method.attached` | Update saved payment methods display |
| `payment_method.detached` | Update saved payment methods display |

---

## 4. Data Model (Prisma Additions)

### 4.1 New Models

```
StripeCustomer
  - id                    String    @id @default(cuid())
  - agentId               String    @unique (FK → Agent)
  - stripeCustomerId      String    @unique
  - defaultPaymentMethod  String?
  - createdAt             DateTime
  - updatedAt             DateTime

Subscription
  - id                    String    @id @default(cuid())
  - agentId               String    @unique (FK → Agent)
  - stripeSubscriptionId  String    @unique
  - status                SubscriptionStatus (active, past_due, canceled, trialing, unpaid)
  - currentPeriodStart    DateTime
  - currentPeriodEnd      DateTime
  - cancelAtPeriodEnd     Boolean   @default(false)
  - trialEnd              DateTime?
  - createdAt             DateTime
  - updatedAt             DateTime

SubscriptionItem
  - id                    String    @id @default(cuid())
  - subscriptionId        String    (FK → Subscription)
  - stripeItemId          String    @unique
  - productType           ProductType (membership, ai_power_tools, marketing_suite, growth_engine, add_on)
  - productName           String
  - stripePriceId         String
  - quantity              Int       @default(1)
  - createdAt             DateTime

EntitlementConfig
  - id                    String    @id @default(cuid())
  - featureKey            String    @unique (e.g., "ai_cma_reports", "campaign_builder")
  - featureName           String    (human-readable name)
  - requiredProduct       ProductType? (null = free for all agents)
  - freeLimit             Int?      (e.g., 5 CMA reports/month on free tier)
  - description           String?
  - isActive              Boolean   @default(true)
  - createdAt             DateTime
  - updatedAt             DateTime

BundleConfig
  - id                    String    @id @default(cuid())
  - name                  String    (e.g., "AI Power Tools")
  - slug                  String    @unique
  - description           String
  - monthlyPriceId        String?   (Stripe Price ID)
  - annualPriceId         String?   (Stripe Price ID)
  - monthlyAmount         Int       (cents)
  - annualAmount          Int       (cents)
  - productType           ProductType
  - isActive              Boolean   @default(true)
  - sortOrder             Int       @default(0)
  - createdAt             DateTime
  - updatedAt             DateTime

BundleFeature
  - id                    String    @id @default(cuid())
  - bundleId              String    (FK → BundleConfig)
  - featureKey            String    (matches EntitlementConfig.featureKey)
  - limit                 Int?      (null = unlimited)
  - createdAt             DateTime

UsageRecord
  - id                    String    @id @default(cuid())
  - agentId               String    (FK → Agent)
  - featureKey            String
  - billingPeriodStart    DateTime
  - billingPeriodEnd      DateTime
  - usageCount            Int       @default(0)
  - updatedAt             DateTime
  @@unique([agentId, featureKey, billingPeriodStart])

PaymentRecord
  - id                    String    @id @default(cuid())
  - agentId               String    (FK → Agent)
  - stripePaymentIntentId String?   (null for cash/check)
  - amount                Int       (cents)
  - currency              String    @default("usd")
  - paymentType           PaymentType (card, ach, cash, check)
  - status                PaymentStatus (processing, succeeded, failed)
  - processedBy           String?   (admin user ID if processed on behalf)
  - notes                 String?   (e.g., check number)
  - createdAt             DateTime

GracePeriodOverride
  - id                    String    @id @default(cuid())
  - agentId               String    (FK → Agent)
  - extendedUntil         DateTime
  - reason                String
  - grantedBy             String    (admin user ID)
  - createdAt             DateTime
```

### 4.2 Key Design Decisions

- **`EntitlementConfig` + `BundleConfig` + `BundleFeature`** make the system fully data-driven. Admins can create/edit bundles, assign features to bundles, and change pricing — all without code changes.
- **`UsageRecord`** tracks per-feature usage per billing period for metering (e.g., 5 CMA reports/month on free tier).
- **`PaymentRecord`** tracks all payments including admin-processed card charges and cash/check records.
- **`GracePeriodOverride`** allows admins to extend grace periods for individual agents.

---

## 5. Feature Gating Logic

### 5.1 Entitlement Check Flow

```
Agent requests a feature (e.g., "Generate CMA Report")
  │
  ├─ Look up EntitlementConfig for feature key "ai_cma_reports"
  │   ├─ requiredProduct = "ai_power_tools"
  │   └─ freeLimit = 5
  │
  ├─ Check agent's SubscriptionItems
  │   ├─ Has "ai_power_tools" bundle? → ALLOW (unlimited)
  │   └─ No bundle?
  │       ├─ Check UsageRecord for current billing period
  │       │   ├─ usageCount < 5? → ALLOW (increment usage)
  │       │   └─ usageCount >= 5? → BLOCK (show upgrade prompt)
  │
  └─ Return: { allowed: boolean, remaining?: number, upgradeBundle?: string }
```

### 5.2 Entitlement Cache

For performance, entitlements are cached:
- On subscription change (webhook), recompute and cache the agent's full entitlement map
- Middleware/server components read from cache, not Stripe
- Cache invalidated on any subscription update event

### 5.3 Grace Period Logic

```
Subscription status = "past_due"
  │
  ├─ Check GracePeriodOverride for agent
  │   ├─ Override exists and extendedUntil > now? → ALLOW full access
  │   └─ No override?
  │       ├─ Days since payment failed <= 7? → ALLOW + warning banner
  │       ├─ Days since payment failed 8-14? → ALLOW + urgent banner
  │       └─ Days since payment failed > 14?
  │           ├─ Bundle features → BLOCKED
  │           └─ Base membership past due → ALL features BLOCKED (lockout screen)
```

Grace period day thresholds (7, 14) are stored as system settings, configurable by admins.

---

## 6. Agent-Facing Pages

### 6.1 Pricing Page (`/pricing` or `/membership`)

Public-facing page showing:
- Base annual membership fee (required for all agents)
- Three feature bundles with feature comparison
- À la carte add-ons
- "Subscribe" buttons → Stripe Checkout session
- FAQ section (what happens if I cancel, how do trials work, etc.)

### 6.2 Billing Dashboard (`/admin/billing` or `/settings/billing`)

Agent's personal billing management page:
- **Current Plan:** Shows base membership + active bundles/add-ons
- **Saved Payment Methods:** List of cards and bank accounts on file, with "Add" and "Remove" buttons, "Set as Autopay" toggle
- **Upcoming Invoice:** Next billing date, amount, line item breakdown
- **Payment History:** Past invoices with status and download links
- **Manage Subscription:** Add/remove bundles, switch monthly↔annual, cancel
- Powered by Stripe Customer Portal (embedded) for PCI compliance

### 6.3 Upgrade Prompts (In-App)

When an agent hits a gated feature:
- **Inline upgrade card** explaining which bundle unlocks the feature
- **Soft usage warning** when approaching free-tier limits: "You've used 4 of 5 CMA reports this month"
- **Hard gate** when limit reached: "Upgrade to AI Power Tools for unlimited CMA reports" with subscribe button

### 6.4 Past-Due Banner

- Persistent top-of-page banner when payment is past due
- Escalating urgency: informational (day 1-7) → warning (day 8-14) → critical (day 15+)
- Links directly to billing page to update payment method

---

## 7. Admin-Facing Pages

### 7.1 Agent Billing Lookup (`/admin/agents/[id]/billing`)

Admin searches for or navigates to a specific agent and sees:
- **Subscription Status:** Active, trialing, past due, canceled
- **Active Bundles & Add-Ons:** What the agent is currently paying for
- **Saved Payment Methods:** Cards and bank accounts on file
- **Payment History:** All payments including admin-processed and cash/check
- **Upcoming Invoice:** Next charge date and amount

**Admin Actions on Agent's Account:**
- **"Process Card Payment"** — Enter card details, charge through Stripe on the agent's behalf. Card can optionally be saved to the agent's profile.
- **"Process Bank Payment (ACH)"** — Enter routing + account number, initiate ACH debit. Bank account can optionally be saved for autopay.
- **"Record Cash/Check Payment"** — Log an offline payment (amount, payment type, check number, notes). Creates a manual payment record and credits the agent's account.
- **"Add Payment Method"** — Save a card or bank account to the agent's Stripe profile without charging it.
- **"Set Autopay"** — Designate which saved payment method is used for automatic charges.
- **"Add/Remove Bundle"** — Modify the agent's subscription line items.
- **"Extend Grace Period"** — Override the default grace period for this agent with a reason.
- **"Comp/Gift Subscription"** — Grant free access to a bundle for a specified duration (e.g., top performer reward).
- **"Cancel Subscription"** — Cancel the agent's subscription (with confirmation).

### 7.2 Bundle & Pricing Management (`/admin/billing/bundles`)

- **View All Bundles:** List of active and archived bundles with pricing
- **Create Bundle:** Name, description, monthly/annual price, assign features from EntitlementConfig
- **Edit Bundle:** Change name, description, pricing, add/remove features
- **Archive Bundle:** Soft-delete (existing subscribers grandfathered, no new sign-ups)
- **Create/Edit Add-On:** Same workflow for à la carte items

### 7.3 Feature Entitlement Management (`/admin/billing/features`)

- **View All Features:** List of gatable features with their current assignment
- **Create Feature:** Define a new feature key, name, description
- **Edit Feature:** Change which bundle it belongs to, adjust free-tier limit
- **Toggle Feature:** Enable/disable a feature globally

### 7.4 Pricing Configuration (`/admin/billing/pricing`)

- **Edit Prices:** Change monthly/annual amounts for any bundle or add-on
- **Price Change Policy:** Choose whether price changes apply to existing subscribers or only new sign-ups
- **Discount/Coupon Management:** Create Stripe coupons (percentage or fixed amount, duration, usage limits)
- **Loyalty Discount:** Configure the existing-agent transition discount

### 7.5 Revenue Dashboard (`/admin/billing/dashboard`)

- **MRR (Monthly Recurring Revenue):** Total and by bundle
- **ARR (Annual Recurring Revenue):** Total
- **Active Subscribers:** Count by bundle, chart over time
- **Churn Rate:** Monthly cancellation rate
- **Upgrade/Downgrade Trends:** Bundle movement over time
- **Past-Due Accounts:** List of agents with overdue payments
- **Revenue by Payment Type:** Card vs. ACH vs. cash/check breakdown
- **Trial Conversion Rate:** % of trial agents who convert to paid

### 7.6 System Settings (`/admin/billing/settings`)

- **Grace Period Thresholds:** Configure days for warning (default 7), urgent warning (default 14), and lockout (default 15)
- **Dunning Email Schedule:** Configure Stripe retry attempts and timing
- **Invoice Notification Timing:** How many days before due date to notify agents
- **Trial Duration:** Default trial period for new agents (default 14 days)
- **Transition Settings:** Grace period for existing agents, loyalty discount percentage

---

## 8. Payment Processing Details

### 8.1 Agent Self-Service Payments

| Action | Flow |
|---|---|
| Initial subscription | Pricing page → Stripe Checkout → webhook activates entitlements |
| Add bundle | Billing page → modify subscription → Stripe prorates |
| Remove bundle | Billing page → modify subscription → takes effect at period end |
| Update payment method | Billing page → Stripe Elements form → saved to customer |
| Pay invoice manually | Email notification → hosted invoice link → pay online |
| Autopay | Saved payment method charged automatically on billing date |

### 8.2 Admin-Processed Payments

| Action | Flow |
|---|---|
| Process card payment | Admin enters card in app → Stripe charge → PaymentRecord created with `processedBy` = admin ID |
| Process ACH payment | Admin enters routing/account → Stripe ACH debit (3-5 day clearing) → PaymentRecord with status "processing" |
| Record cash payment | Admin logs amount + notes → PaymentRecord with type "cash", no Stripe charge |
| Record check payment | Admin logs amount + check number + notes → PaymentRecord with type "check", no Stripe charge |
| Save payment method for agent | Admin enters card/bank details → saved to agent's Stripe customer → available for autopay |

### 8.3 ACH-Specific Handling

- ACH payments take 3-5 business days to clear
- During clearing, subscription shows "Payment Processing" status
- If ACH fails (insufficient funds, invalid account), dunning/grace period flow begins
- Micro-deposit verification: Stripe sends two small deposits (usually $0.01 each), agent or admin confirms the amounts to verify the account

---

## 9. Security & Compliance

- **PCI Compliance:** All card data handled by Stripe Elements / Checkout — the app never sees or stores raw card numbers
- **ACH Data:** Bank routing/account numbers collected via Stripe's secure forms, not stored in the app database
- **Admin Audit Trail:** All admin actions on agent billing are logged (who did what, when)
- **Webhook Verification:** All Stripe webhooks verified using webhook signing secret
- **HTTPS Only:** All payment pages served over HTTPS
- **Role-Based Access:** Only users with admin role can access billing management pages

---

## 10. Implementation Scope

### In Scope (This Spec)
- Stripe integration (products, prices, subscriptions, webhooks)
- Agent billing self-service (pricing page, billing dashboard, payment methods)
- Admin billing management (agent lookup, payment processing, bundle/feature/pricing management)
- Feature gating system (entitlements, usage metering, grace periods)
- Revenue dashboard
- Database models and API routes
- Upgrade prompts and past-due banners

### Out of Scope (Future Phases)
- Vendor/partner monetization (see `docs/ideas/vendor-monetization-model.md`)
- Consumer-facing paid features
- AI-as-a-Service for non-agents
- Transaction fee per closed deal
- Training marketplace
- Data products / market analytics API

---

## 11. Verification Plan

### Functional Testing
1. **Subscription lifecycle:** Create subscription → verify entitlements → upgrade (add bundle) → downgrade (remove bundle) → cancel → verify access revoked
2. **Payment methods:** Add card → add bank account (ACH) → set autopay → process payment → verify invoice
3. **Admin payment processing:** Process card payment for agent → process ACH → record cash payment → record check payment → verify all reflected in agent's account
4. **Feature gating:** Verify free-tier limits enforced → verify bundle unlocks features → verify usage metering increments → verify upgrade prompts shown
5. **Grace period:** Simulate failed payment → verify warning banners at day 1/8/15 → verify lockout → admin extends grace period → verify access restored
6. **Admin bundle management:** Create bundle → assign features → edit pricing → archive bundle → verify existing subscribers grandfathered
7. **New agent trial:** Create agent → verify 14-day trial → verify trial-end notification → verify fallback to free tier

### Integration Testing
- Stripe webhook delivery and processing (use Stripe CLI for local testing)
- Stripe Checkout session creation and completion
- Stripe Customer Portal embedding
- ACH verification flow (Plaid instant + micro-deposit)

### E2E Testing
- Full agent journey: sign up → select plan → pay → use features → manage billing
- Full admin journey: look up agent → process payment → modify subscription → view dashboard
