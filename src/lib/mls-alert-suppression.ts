import { prisma } from "@/lib/prisma";
import { mlsPublicSearchEnabled } from "@/lib/mls-launch";

const MLS_PROVIDER = "stellar";

type SyncStateMetadata = {
  backfillAlertsSuppressed?: unknown;
};

export async function areMlsBackfillAlertsSuppressed(): Promise<boolean> {
  if (!mlsPublicSearchEnabled()) {
    return true;
  }

  if (process.env.MLS_BACKFILL_ALERTS_SUPPRESSED === "true") {
    return true;
  }

  const state = await prisma.syncState.findUnique({
    where: { provider: MLS_PROVIDER },
    select: { status: true, metadata: true },
  });

  if (state?.status !== "syncing") {
    return false;
  }

  return metadataSuppressesAlerts(state.metadata);
}

function metadataSuppressesAlerts(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return false;
  }

  return (metadata as SyncStateMetadata).backfillAlertsSuppressed === true;
}
