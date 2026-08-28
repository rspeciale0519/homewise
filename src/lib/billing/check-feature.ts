import { checkEntitlement, incrementUsage } from "@/lib/billing/entitlements";
import type { EntitlementCheck } from "@/lib/billing/entitlements";
import { prisma } from "@/lib/prisma";

export async function checkFeatureAccess(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  return checkEntitlement(agentId, featureKey, prisma, { requireActiveConfig: true });
}

export async function reserveFeatureUsage(
  agentId: string,
  featureKey: string,
): Promise<EntitlementCheck> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const check = await checkEntitlement(agentId, featureKey, tx, {
            requireActiveConfig: true,
          });
          if (check.allowed) {
            await incrementUsage(agentId, featureKey, tx);
          }
          return check;
        },
        { isolationLevel: "Serializable" },
      );
    } catch (error) {
      const code = typeof error === "object" && error !== null && "code" in error
        ? (error as { code?: unknown }).code
        : undefined;
      if (code !== "P2034" || attempt === 2) throw error;
    }
  }

  throw new Error("Feature usage reservation failed");
}
