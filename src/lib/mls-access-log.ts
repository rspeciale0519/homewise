import { prisma } from "@/lib/prisma";

export type MlsTier = "idx" | "vow" | "bo";

export type MlsAccessAction =
  | "search"
  | "view_listing"
  | "view_sold"
  | "vow_register"
  | "cma"
  | "market_stats";

export interface MlsAccessEntry {
  userId?: string | null;
  tier: MlsTier;
  action: MlsAccessAction;
  listingId?: string | null;
  detail?: string | null;
  ipAddress?: string | null;
}

/**
 * Append-only MLS Grid data access trail (License Agreement §VIII). Logging
 * must never block the user-facing action, so failures are swallowed.
 */
export async function logMlsAccess(entry: MlsAccessEntry): Promise<void> {
  try {
    await prisma.mlsAccessLog.create({
      data: {
        userId: entry.userId ?? null,
        tier: entry.tier,
        action: entry.action,
        listingId: entry.listingId ?? null,
        detail: entry.detail ?? null,
        ipAddress: entry.ipAddress ?? null,
      },
    });
  } catch {
    // Access logging is best-effort; never surface to the consumer.
  }
}
