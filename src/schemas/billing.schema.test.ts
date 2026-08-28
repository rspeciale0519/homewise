import { describe, expect, it } from "vitest";
import {
  adminModifySubscriptionSchema,
  adminRecordOfflinePaymentSchema,
  billingSettingsSchema,
  cancelSubscriptionSchema,
  changeSubscriptionIntervalSchema,
  checkoutSessionSchema,
  couponCreateSchema,
  modifySubscriptionSchema,
  productCreateSchema,
  productUpdateSchema,
} from "./billing.schema";

const validSettings = {
  gracePeriodWarningDays: 7,
  gracePeriodUrgentDays: 14,
  gracePeriodLockoutDays: 15,
  invoiceNotifyDays: 7,
  trialDurationDays: 14,
  transitionGraceDays: 30,
  loyaltyDiscountPercent: 20,
};
const operationId = "123e4567-e89b-42d3-a456-426614174000";

describe("billingSettingsSchema", () => {
  it("accepts ordered grace-period thresholds", () => {
    expect(billingSettingsSchema.safeParse(validSettings).success).toBe(true);
  });

  it("rejects a warning threshold at or after the urgent threshold", () => {
    const result = billingSettingsSchema.safeParse({
      ...validSettings,
      gracePeriodWarningDays: 14,
    });

    expect(result.success).toBe(false);
  });

  it("rejects an urgent threshold at or after the lockout threshold", () => {
    const result = billingSettingsSchema.safeParse({
      ...validSettings,
      gracePeriodUrgentDays: 15,
    });

    expect(result.success).toBe(false);
  });
});

describe("billing product selections", () => {
  const validProduct = {
    name: "AI Power Tools",
    slug: "ai_power_tools",
    description: "AI features for agents",
    monthlyAmount: 2_000,
    annualAmount: 20_000,
    productType: "bundle",
  };

  it("rejects duplicate feature keys when creating a product", () => {
    expect(productCreateSchema.safeParse({
      ...validProduct,
      featureKeys: ["ai_cma_reports", "ai_cma_reports"],
    }).success).toBe(false);
  });

  it("rejects normalized duplicate feature keys when updating a product", () => {
    expect(productUpdateSchema.safeParse({
      featureKeys: ["ai_cma_reports", " AI_CMA_REPORTS "],
    }).success).toBe(false);
  });

  it("rejects duplicate checkout slugs", () => {
    expect(checkoutSessionSchema.safeParse({
      operationId,
      bundles: ["ai_power_tools", "ai_power_tools"],
      addOns: [],
    }).success).toBe(false);
  });

  it("rejects a checkout slug in both product groups", () => {
    expect(checkoutSessionSchema.safeParse({
      operationId,
      bundles: ["ai_power_tools"],
      addOns: ["ai_power_tools"],
    }).success).toBe(false);
  });

  it("rejects overlapping user subscription changes", () => {
    expect(modifySubscriptionSchema.safeParse({
      operationId,
      addBundles: ["growth_engine"],
      removeBundles: ["growth_engine"],
    }).success).toBe(false);
  });

  it("accepts an add-on-only subscription change", () => {
    const result = modifySubscriptionSchema.safeParse({
      operationId,
      addOns: ["extra_ai_credits"],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        operationId,
        addBundles: [],
        removeBundles: [],
        addOns: ["extra_ai_credits"],
        removeAddOns: [],
      });
    }
  });

  it("rejects a product added as both a bundle and an add-on", () => {
    expect(modifySubscriptionSchema.safeParse({
      operationId,
      addBundles: ["ai_power_tools"],
      addOns: ["ai_power_tools"],
    }).success).toBe(false);
  });

  it("rejects a product added and removed across product groups", () => {
    expect(modifySubscriptionSchema.safeParse({
      operationId,
      addBundles: ["growth_engine"],
      removeAddOns: ["growth_engine"],
    }).success).toBe(false);
  });

  it("rejects duplicate admin subscription changes", () => {
    expect(adminModifySubscriptionSchema.safeParse({
      agentId: "agent-1",
      addBundles: ["growth_engine", "growth_engine"],
      removeBundles: [],
    }).success).toBe(false);
  });

  it("requires a checkout operation ID", () => {
    expect(checkoutSessionSchema.safeParse({
      bundles: ["ai_power_tools"],
    }).success).toBe(false);
  });

  it("requires a subscription modification operation ID", () => {
    expect(modifySubscriptionSchema.safeParse({
      removeBundles: ["growth_engine"],
    }).success).toBe(false);
  });

  it("requires an offline payment operation ID", () => {
    expect(adminRecordOfflinePaymentSchema.safeParse({
      agentId: "agent-1",
      amount: 5_000,
      paymentType: "check",
    }).success).toBe(false);
  });

  it("rejects unknown cancellation and interval fields", () => {
    expect(cancelSubscriptionSchema.safeParse({
      reason: "temporary",
      agentId: "agent-2",
    }).success).toBe(false);
    expect(changeSubscriptionIntervalSchema.safeParse({
      operationId,
      interval: "annual",
      agentId: "agent-2",
    }).success).toBe(false);
  });

  it("requires an interval change operation ID", () => {
    expect(changeSubscriptionIntervalSchema.safeParse({
      interval: "annual",
    }).success).toBe(false);
  });
});

describe("couponCreateSchema", () => {
  it("accepts exactly one discount form", () => {
    expect(couponCreateSchema.safeParse({
      name: "Launch",
      percentOff: 20,
      duration: "once",
    }).success).toBe(true);
    expect(couponCreateSchema.safeParse({
      name: "Quarterly",
      amountOff: 1_000,
      duration: "repeating",
      durationInMonths: 3,
    }).success).toBe(true);
  });

  it("rejects missing or conflicting discount forms", () => {
    expect(couponCreateSchema.safeParse({
      name: "Missing",
      duration: "once",
    }).success).toBe(false);
    expect(couponCreateSchema.safeParse({
      name: "Conflicting",
      percentOff: 20,
      amountOff: 1_000,
      duration: "once",
    }).success).toBe(false);
  });

  it("requires months only for repeating coupons", () => {
    expect(couponCreateSchema.safeParse({
      name: "Missing months",
      percentOff: 20,
      duration: "repeating",
    }).success).toBe(false);
    expect(couponCreateSchema.safeParse({
      name: "Unexpected months",
      percentOff: 20,
      duration: "forever",
      durationInMonths: 3,
    }).success).toBe(false);
  });
});
