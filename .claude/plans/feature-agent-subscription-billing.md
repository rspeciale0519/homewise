# Feature: Agent Subscription & Billing System

## Context
Replaces manual phone/in-person membership fee collection with Stripe-powered billing. Introduces feature bundles (AI Power Tools, Marketing Suite, Growth Engine) and à la carte add-ons. Gives agents self-service billing and admins full control over pricing, payments, and bundle configuration.

## Spec
`docs/superpowers/specs/2026-03-28-agent-subscription-billing-design.md`

## Full Implementation Plan
`docs/superpowers/plans/2026-03-28-agent-subscription-billing.md`

## Summary (13 Tasks)

1. **Install Stripe SDK & Configure Environment** — `stripe` package, env vars, client singleton
2. **Prisma Schema Models** — 9 new models (StripeCustomer, Subscription, SubscriptionItem, EntitlementConfig, BundleConfig, BundleFeature, UsageRecord, PaymentRecord, GracePeriodOverride, BillingSettings)
3. **Zod Schemas** — Validation for checkout, bundles, features, payments, settings, coupons
4. **Entitlement Engine** — Feature gating logic, usage metering, grace period checking, Stripe sync
5. **Stripe Webhook Handler** — Subscription lifecycle events at `/api/webhooks/stripe`
6. **Billing API Routes** — Checkout session, customer portal, subscription status
7. **Admin Billing API Routes** — Agent lookup, payment processing (card/ACH/cash/check), subscription management, bundle CRUD, feature CRUD, settings, dashboard metrics, coupons
8. **Seed Data** — Create Stripe Products/Prices, populate BundleConfig + EntitlementConfig
9. **Admin Pages** — Sidebar nav + 6 admin billing pages (revenue dashboard, agent billing list/detail, bundle mgmt, feature mgmt, settings)
10. **Pricing Page** — Public page with bundle cards, add-ons, Stripe Checkout integration
11. **Agent Billing Dashboard** — Self-service billing management at `/dashboard/billing`
12. **Feature Gating Integration** — Upgrade prompts, past-due banners, server-side feature checks
13. **Testing & Verification** — Unit tests for entitlements/grace period, E2E verification
