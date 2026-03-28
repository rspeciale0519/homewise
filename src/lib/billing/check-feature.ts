import { checkEntitlement, incrementUsage } from "@/lib/billing/entitlements";
import type { EntitlementCheck } from "@/lib/billing/entitlements";

export async function checkFeatureAccess(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  return checkEntitlement(agentId, featureKey);
}

export async function useFeature(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  const check = await checkEntitlement(agentId, featureKey);
  if (check.allowed) {
    await incrementUsage(agentId, featureKey);
  }
  return check;
}
