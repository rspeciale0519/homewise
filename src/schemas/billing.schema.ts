import { z } from "zod";

const billingSlugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9_-]+$/);

const uniqueBillingSlugs = z
  .array(billingSlugSchema)
  .max(20)
  .refine((values) => new Set(values).size === values.length, {
    message: "Duplicate product selections are not allowed",
  });

const billingFeatureKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .toLowerCase()
  .regex(/^[a-z0-9_]+$/);

const uniqueBillingFeatureKeys = z
  .array(billingFeatureKeySchema)
  .refine((values) => new Set(values).size === values.length, {
    message: "Duplicate feature keys are not allowed",
  });

function rejectOverlappingBundleChanges(
  value: { addBundles: string[]; removeBundles: string[] },
  context: z.RefinementCtx,
): void {
  const removals = new Set(value.removeBundles);
  if (value.addBundles.some((slug) => removals.has(slug))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product cannot be added and removed in the same request",
    });
  }
}

function rejectOverlappingProductChanges(
  value: {
    addBundles: string[];
    removeBundles: string[];
    addOns: string[];
    removeAddOns: string[];
  },
  context: z.RefinementCtx,
): void {
  const additions = [...value.addBundles, ...value.addOns];
  const removals = new Set([...value.removeBundles, ...value.removeAddOns]);

  if (new Set(additions).size !== additions.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product cannot be added as both a bundle and an add-on",
    });
  }

  const removedProducts = [...value.removeBundles, ...value.removeAddOns];
  if (new Set(removedProducts).size !== removedProducts.length) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product cannot be removed as both a bundle and an add-on",
    });
  }

  if (additions.some((slug) => removals.has(slug))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product cannot be added and removed in the same request",
    });
  }
}

// ─── Checkout ──────────────────────────────────────────────

export const checkoutSessionSchema = z.object({
  operationId: z.string().uuid(),
  bundles: uniqueBillingSlugs.default([]),
  addOns: uniqueBillingSlugs.default([]),
  billingInterval: z.enum(["monthly", "annual"]).default("annual"),
  successUrl: z.string().url().max(2_048).optional(),
  cancelUrl: z.string().url().max(2_048).optional(),
}).strict().superRefine((value, context) => {
  const addOns = new Set(value.addOns);
  if (value.bundles.some((slug) => addOns.has(slug))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "A product cannot be selected as both a bundle and an add-on",
    });
  }
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
  featureKeys: uniqueBillingFeatureKeys.default([]),
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
  agentId: z.string().trim().min(1).max(100),
  amount: z.number().int().min(100).max(10_000_000),
  paymentMethodId: z.string().trim().min(1).max(255),
  operationId: z.string().uuid(),
  savePaymentMethod: z.boolean().default(false),
  description: z.string().max(500).optional(),
}).strict();

export type AdminProcessCardPaymentInput = z.infer<typeof adminProcessCardPaymentSchema>;

export const adminRecordOfflinePaymentSchema = z.object({
  agentId: z.string().trim().min(1).max(100),
  operationId: z.string().uuid(),
  amount: z.number().int().min(100).max(10_000_000),
  paymentType: z.enum(["cash", "check"]),
  notes: z.string().max(1000).optional().or(z.literal("")),
}).strict();

export type AdminRecordOfflinePaymentInput = z.infer<typeof adminRecordOfflinePaymentSchema>;

// ─── Admin: Subscription Management ────────────────────────

export const adminModifySubscriptionSchema = z.object({
  agentId: z.string().trim().min(1).max(100),
  addBundles: uniqueBillingSlugs.default([]),
  removeBundles: uniqueBillingSlugs.default([]),
}).strict().superRefine(rejectOverlappingBundleChanges);

export const modifySubscriptionSchema = z.object({
  operationId: z.string().uuid(),
  addBundles: uniqueBillingSlugs.default([]),
  removeBundles: uniqueBillingSlugs.default([]),
  addOns: uniqueBillingSlugs.default([]),
  removeAddOns: uniqueBillingSlugs.default([]),
}).strict().superRefine(rejectOverlappingProductChanges);

export const cancelSubscriptionSchema = z.object({
  reason: z.string().trim().min(1).max(500).optional(),
}).strict();

export const changeSubscriptionIntervalSchema = z.object({
  operationId: z.string().uuid(),
  interval: z.enum(["monthly", "annual"]),
}).strict();

export type AdminModifySubscriptionInput = z.infer<typeof adminModifySubscriptionSchema>;

export const adminExtendGracePeriodSchema = z.object({
  agentId: z.string().min(1),
  extendedUntil: z.string().datetime(),
  reason: z.string().min(1).max(500).trim(),
});

export type AdminExtendGracePeriodInput = z.infer<typeof adminExtendGracePeriodSchema>;

// ─── Admin: Billing Settings ───────────────────────────────

const billingSettingsFields = {
  gracePeriodWarningDays: z.number().int().min(1).max(30),
  gracePeriodUrgentDays: z.number().int().min(1).max(60),
  gracePeriodLockoutDays: z.number().int().min(1).max(90),
  invoiceNotifyDays: z.number().int().min(1).max(30),
  trialDurationDays: z.number().int().min(0).max(90),
  transitionGraceDays: z.number().int().min(0).max(90),
  loyaltyDiscountPercent: z.number().int().min(0).max(100),
};

export const billingSettingsSchema = z
  .object(billingSettingsFields)
  .superRefine((settings, context) => {
    if (settings.gracePeriodWarningDays >= settings.gracePeriodUrgentDays) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gracePeriodWarningDays"],
        message: "Warning days must be less than urgent days",
      });
    }

    if (settings.gracePeriodUrgentDays >= settings.gracePeriodLockoutDays) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["gracePeriodUrgentDays"],
        message: "Urgent days must be less than lockout days",
      });
    }
  });

export const billingSettingsUpdateSchema = z.object({
  gracePeriodWarningDays: billingSettingsFields.gracePeriodWarningDays.optional(),
  gracePeriodUrgentDays: billingSettingsFields.gracePeriodUrgentDays.optional(),
  gracePeriodLockoutDays: billingSettingsFields.gracePeriodLockoutDays.optional(),
  invoiceNotifyDays: billingSettingsFields.invoiceNotifyDays.optional(),
  trialDurationDays: billingSettingsFields.trialDurationDays.optional(),
  transitionGraceDays: billingSettingsFields.transitionGraceDays.optional(),
  loyaltyDiscountPercent: billingSettingsFields.loyaltyDiscountPercent.optional(),
}).strict();

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
  .superRefine((data, context) => {
    const discountCount = Number(data.percentOff !== undefined) +
      Number(data.amountOff !== undefined);
    if (discountCount !== 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one of percentOff or amountOff is required",
      });
    }

    if (data.duration === "repeating" && data.durationInMonths === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationInMonths"],
        message: "durationInMonths is required for repeating coupons",
      });
    }

    if (data.duration !== "repeating" && data.durationInMonths !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["durationInMonths"],
        message: "durationInMonths is only valid for repeating coupons",
      });
    }
  });

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
