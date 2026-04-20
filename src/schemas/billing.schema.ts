import { z } from "zod";

// ─── Checkout ──────────────────────────────────────────────

export const checkoutSessionSchema = z.object({
  bundles: z.array(z.string()).default([]),
  addOns: z.array(z.string()).default([]),
  billingInterval: z.enum(["monthly", "annual"]).default("annual"),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

export type CheckoutSessionInput = z.infer<typeof checkoutSessionSchema>;

// ─── Admin: Product Management ──────────────────────────────

export const productCreateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  slug: z.string().min(1).max(100).trim().toLowerCase().regex(/^[a-z0-9_-]+$/),
  description: z.string().min(1).max(2000).trim(),
  monthlyAmount: z.number().int().min(0),
  annualAmount: z.number().int().min(0),
  productType: z.string().min(1).max(50),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
  featureKeys: z.array(z.string()).default([]),
});

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.partial();

export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;

// ─── Admin: Feature/Entitlement Management ─────────────────

export const entitlementCreateSchema = z.object({
  featureKey: z.string().min(1).max(100).trim().toLowerCase().regex(/^[a-z0-9_]+$/),
  featureName: z.string().min(1).max(200).trim(),
  requiredProduct: z.string().max(50).nullable().default(null),
  freeLimit: z.number().int().min(0).nullable().default(null),
  description: z.string().max(1000).trim().optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

export type EntitlementCreateInput = z.infer<typeof entitlementCreateSchema>;

export const entitlementUpdateSchema = entitlementCreateSchema.partial();

export type EntitlementUpdateInput = z.infer<typeof entitlementUpdateSchema>;

// ─── Admin: Payment Processing ─────────────────────────────

export const adminProcessCardPaymentSchema = z.object({
  agentId: z.string().min(1),
  amount: z.number().int().min(100),
  paymentMethodId: z.string().min(1).optional(),
  savePaymentMethod: z.boolean().default(false),
  description: z.string().max(500).optional(),
});

export type AdminProcessCardPaymentInput = z.infer<typeof adminProcessCardPaymentSchema>;

export const adminRecordOfflinePaymentSchema = z.object({
  agentId: z.string().min(1),
  amount: z.number().int().min(100),
  paymentType: z.enum(["cash", "check"]),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type AdminRecordOfflinePaymentInput = z.infer<typeof adminRecordOfflinePaymentSchema>;

// ─── Admin: Subscription Management ────────────────────────

export const adminModifySubscriptionSchema = z.object({
  agentId: z.string().min(1),
  addBundles: z.array(z.string()).default([]),
  removeBundles: z.array(z.string()).default([]),
});

export type AdminModifySubscriptionInput = z.infer<typeof adminModifySubscriptionSchema>;

export const adminExtendGracePeriodSchema = z.object({
  agentId: z.string().min(1),
  extendedUntil: z.string().datetime(),
  reason: z.string().min(1).max(500).trim(),
});

export type AdminExtendGracePeriodInput = z.infer<typeof adminExtendGracePeriodSchema>;

// ─── Admin: Billing Settings ───────────────────────────────

export const billingSettingsUpdateSchema = z.object({
  gracePeriodWarningDays: z.number().int().min(1).max(30).optional(),
  gracePeriodUrgentDays: z.number().int().min(1).max(60).optional(),
  gracePeriodLockoutDays: z.number().int().min(1).max(90).optional(),
  invoiceNotifyDays: z.number().int().min(1).max(30).optional(),
  trialDurationDays: z.number().int().min(0).max(90).optional(),
  transitionGraceDays: z.number().int().min(0).max(90).optional(),
  loyaltyDiscountPercent: z.number().int().min(0).max(100).optional(),
});

export type BillingSettingsUpdateInput = z.infer<typeof billingSettingsUpdateSchema>;

// ─── Admin: Coupon Management ──────────────────────────────

export const couponCreateSchema = z
  .object({
    name: z.string().min(1).max(200).trim(),
    percentOff: z.number().min(1).max(100).optional(),
    amountOff: z.number().int().min(100).optional(),
    duration: z.enum(["once", "repeating", "forever"]),
    durationInMonths: z.number().int().min(1).max(36).optional(),
    maxRedemptions: z.number().int().min(1).optional(),
  })
  .refine(
    (data) => data.percentOff !== undefined || data.amountOff !== undefined,
    { message: "Either percentOff or amountOff is required" }
  );

export type CouponCreateInput = z.infer<typeof couponCreateSchema>;

// ─── Agent Billing Filters ─────────────────────────────────

export const billingAgentFilterSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["all", "active", "past_due", "canceled", "trialing"]).default("all"),
  bundle: z.string().max(50).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type BillingAgentFilterInput = z.infer<typeof billingAgentFilterSchema>;
