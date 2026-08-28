import { NextResponse } from "next/server";
import { reserveFeatureUsage } from "@/lib/billing/check-feature";

interface StaffFeatureIdentity {
  isAdmin: boolean;
  agentId: string | null;
}

export async function reserveStaffFeature(
  identity: StaffFeatureIdentity,
  featureKey: string,
): Promise<NextResponse | null> {
  if (identity.isAdmin) return null;
  if (!identity.agentId) {
    return NextResponse.json({ error: "Agent profile not linked" }, { status: 403 });
  }

  const entitlement = await reserveFeatureUsage(identity.agentId, featureKey);
  if (entitlement.allowed) return null;

  return NextResponse.json(
    {
      error: "This feature is not available with the current subscription.",
      upgradeBundle: entitlement.upgradeBundle,
    },
    { status: 403 },
  );
}
