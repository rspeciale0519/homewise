import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { hasCredentials, fetchListings } from "@/lib/mls-grid";
import type { ResoProperty } from "@/types/reso";

export const mlsSync = inngest.createFunction(
  {
    id: "mls-sync",
    name: "MLS Grid Sync",
    retries: 2,
  },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    if (!hasCredentials()) {
      return { skipped: true, reason: "No MLS Grid credentials configured" };
    }

    const syncState = await step.run("get-sync-state", async () => {
      return prisma.syncState.upsert({
        where: { provider: "stellar" },
        update: { status: "syncing", updatedAt: new Date() },
        create: { provider: "stellar", status: "syncing" },
      });
    });

    const modifiedAfter = syncState.lastSyncAt
      ? new Date(syncState.lastSyncAt).toISOString()
      : undefined;
    let totalUpserted = 0;
    let skip = 0;
    const pageSize = 200;

    try {
      let hasMore = true;

      while (hasMore) {
        const batch = await step.run(`fetch-page-${skip}`, async () => {
          return fetchListings({ modifiedAfter, top: pageSize, skip });
        });

        if (batch.value.length === 0) {
          hasMore = false;
          break;
        }

        const upsertCount = await step.run(`upsert-page-${skip}`, async () => {
          let count = 0;
          for (const listing of batch.value) {
            await upsertListing(listing);
            count++;
          }
          return count;
        });

        totalUpserted += upsertCount;
        skip += pageSize;

        if (batch.value.length < pageSize || !batch["@odata.nextLink"]) {
          hasMore = false;
        }
      }

      await step.run("update-sync-success", async () => {
        return prisma.syncState.update({
          where: { provider: "stellar" },
          data: {
            status: "idle",
            lastSyncAt: new Date(),
            totalSynced: { increment: totalUpserted },
            lastError: null,
          },
        });
      });

      return { synced: totalUpserted, status: "success" };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      await prisma.syncState.update({
        where: { provider: "stellar" },
        data: { status: "error", lastError: message },
      });
      throw error;
    }
  }
);

async function upsertListing(reso: ResoProperty): Promise<void> {
  const mlsId = reso.ListingId || reso.ListingKey;
  const photos = (reso.Media ?? [])
    .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    .map((m) => m.MediaURL);

  const openHouse = reso.OpenHouse?.map((oh) => ({
    date: oh.OpenHouseDate,
    startTime: oh.OpenHouseStartTime,
    endTime: oh.OpenHouseEndTime,
    remarks: oh.OpenHouseRemarks,
  }));

  const data = {
    status: mapStatus(reso.StandardStatus),
    price: reso.ListPrice,
    closePrice: reso.ClosePrice ?? null,
    originalListPrice: reso.OriginalListPrice ?? null,
    address: reso.UnparsedAddress,
    city: reso.City,
    state: reso.StateOrProvince ?? "FL",
    zip: reso.PostalCode,
    county: reso.CountyOrParish ?? null,
    subdivision: reso.SubdivisionName ?? null,
    beds: reso.BedroomsTotal,
    bathsFull: reso.BathroomsFull,
    bathsHalf: reso.BathroomsHalf ?? 0,
    baths: reso.BathroomsTotalDecimal,
    sqft: reso.LivingArea,
    lotSize: reso.LotSizeArea ?? null,
    yearBuilt: reso.YearBuilt ?? null,
    propertyType: reso.PropertyType,
    propertySubType: reso.PropertySubType ?? null,
    description: reso.PublicRemarks ?? null,
    photos,
    imageUrl: photos[0] ?? null,
    latitude: reso.Latitude ?? null,
    longitude: reso.Longitude ?? null,
    hoaFee: reso.AssociationFee ?? null,
    hoaFrequency: reso.AssociationFeeFrequency ?? null,
    taxAmount: reso.TaxAnnualAmount ?? null,
    taxYear: reso.TaxYear ?? null,
    hasPool: reso.PoolPrivateYN ?? false,
    hasWaterfront: reso.WaterfrontYN ?? false,
    hasGarage: reso.GarageYN ?? false,
    garageSpaces: reso.GarageSpaces ?? 0,
    isNewConstruction: reso.NewConstructionYN ?? false,
    hasGatedCommunity: (reso.CommunityFeatures ?? []).some((f) =>
      f.toLowerCase().includes("gated")
    ),
    daysOnMarket: reso.DaysOnMarket ?? 0,
    listDate: reso.ListingContractDate ? new Date(reso.ListingContractDate) : null,
    closeDate: reso.CloseDate ? new Date(reso.CloseDate) : null,
    openHouseSchedule: openHouse ?? undefined,
    schoolDistrict: reso.SchoolDistrict ?? null,
    elementarySchool: reso.ElementarySchool ?? null,
    middleSchool: reso.MiddleOrJuniorSchool ?? null,
    highSchool: reso.HighSchool ?? null,
    listingAgentName: reso.ListAgentFullName ?? null,
    listingAgentMlsId: reso.ListAgentMlsId ?? null,
    listingAgentPhone: reso.ListAgentDirectPhone ?? null,
    listingAgentEmail: reso.ListAgentEmail ?? null,
    listingOfficeName: reso.ListOfficeName ?? null,
    listingOfficeMlsId: reso.ListOfficeMlsId ?? null,
    virtualTourUrl: reso.VirtualTourURLUnbranded ?? null,
    mlsLastModified: new Date(reso.ModificationTimestamp),
    syncedAt: new Date(),
  };

  await prisma.listing.upsert({
    where: { mlsId },
    update: data,
    create: { mlsId, mlsSource: "stellar", ...data },
  });
}

function mapStatus(resoStatus: string): string {
  switch (resoStatus) {
    case "Active":
      return "Active";
    case "Pending":
      return "Pending";
    case "Closed":
      return "Sold";
    case "Coming Soon":
      return "Coming Soon";
    default:
      return resoStatus;
  }
}
