import type { Prisma } from "@prisma/client";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { isHomewiseOffice } from "@/lib/mls-featured";
import { proxyPhotoUrl } from "@/lib/mls-image";
import { limitMlsPhotoSources } from "@/lib/mls-media-budget";
import type { ResoProperty } from "@/types/reso";

export type ExistingListingPrice = {
  price: number;
} | null;

export type ListingSyncData = Prisma.ListingUncheckedCreateInput & {
  mlsId: string;
  mlsSource: "stellar";
  photos: string[];
  photoSources: string[];
};

function sortedPhotoSources(reso: ResoProperty): string[] {
  return limitMlsPhotoSources([...(reso.Media ?? [])]
    .sort((a, b) => (a.Order ?? 0) - (b.Order ?? 0))
    .map((media) => media.MediaURL));
}

export type PriceHistoryEntry = {
  price: number;
  observedAt: Date;
  source: string;
};

export type PriceSnapshotInput = {
  price: number;
  originalListPrice?: number | null;
  listDate?: Date | null;
  mlsLastModified?: Date | null;
  syncedAt: Date;
};

export function priceHistoryEntriesFor(
  existing: ExistingListingPrice,
  snapshot: PriceSnapshotInput,
): PriceHistoryEntry[] {
  const observedAt = snapshot.mlsLastModified ?? snapshot.syncedAt;

  if (!existing) {
    const entries: PriceHistoryEntry[] = [];
    if (snapshot.originalListPrice != null && snapshot.originalListPrice !== snapshot.price) {
      entries.push({
        price: snapshot.originalListPrice,
        observedAt: snapshot.listDate ?? observedAt,
        source: "import",
      });
    }
    entries.push({ price: snapshot.price, observedAt, source: "import" });
    return entries;
  }

  if (existing.price !== snapshot.price) {
    return [{ price: snapshot.price, observedAt, source: "sync" }];
  }

  return [];
}

export function mapStatus(resoStatus: string): string {
  switch (resoStatus) {
    case "Active":
      return "Active";
    case "Pending":
      return "Pending";
    case "Closed":
      return "Sold";
    case "ComingSoon":
    case "Coming Soon":
      return "Coming Soon";
    case "Withdrawn":
    case "Expired":
      return resoStatus;
    default:
      return resoStatus;
  }
}

export function detectPriceChange(
  previous: ExistingListingPrice,
  next: Pick<ResoProperty, "ListPrice">,
): boolean {
  return previous !== null && previous.price !== next.ListPrice;
}

function totalBaths(reso: ResoProperty): number {
  return (
    reso.BathroomsTotalDecimal ??
    reso.BathroomsTotalInteger ??
    (reso.BathroomsFull ?? 0) + (reso.BathroomsHalf ?? 0) * 0.5
  );
}

export function mapResoToListingData(reso: ResoProperty): ListingSyncData {
  const photoSources = sortedPhotoSources(reso);
  const photos = photoSources.map((sourceUrl) => proxyPhotoUrl(sourceUrl));
  const schoolDistrict =
    reso.ElementarySchoolDistrict ??
    reso.MiddleOrJuniorSchoolDistrict ??
    reso.HighSchoolDistrict ??
    null;

  return {
    mlsId: reso.ListingKey,
    listingId: reso.ListingId,
    mlsSource: "stellar",
    status: mapStatus(reso.StandardStatus),
    price: reso.ListPrice,
    closePrice: reso.ClosePrice ?? null,
    originalListPrice: reso.OriginalListPrice ?? null,
    address: reso.UnparsedAddress ?? "",
    city: reso.City ?? "",
    state: reso.StateOrProvince ?? "FL",
    zip: reso.PostalCode ?? "",
    county: reso.CountyOrParish ?? null,
    subdivision: reso.SubdivisionName ?? null,
    beds: reso.BedroomsTotal ?? 0,
    bathsFull: reso.BathroomsFull ?? 0,
    bathsHalf: reso.BathroomsHalf ?? 0,
    baths: totalBaths(reso),
    sqft: reso.LivingArea ?? 0,
    lotSize: reso.LotSizeArea ?? null,
    yearBuilt: reso.YearBuilt ?? null,
    propertyType: reso.PropertyType,
    propertySubType: reso.PropertySubType ?? null,
    description: reso.PublicRemarks ?? null,
    photos,
    photoSources,
    photosChangeTimestamp: reso.PhotosChangeTimestamp
      ? new Date(reso.PhotosChangeTimestamp)
      : null,
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
    hasGatedCommunity: (reso.CommunityFeatures ?? []).some((feature) =>
      feature.toLowerCase().includes("gated"),
    ),
    daysOnMarket: reso.DaysOnMarket ?? 0,
    listDate: reso.ListingContractDate ? new Date(reso.ListingContractDate) : null,
    closeDate: reso.CloseDate ? new Date(reso.CloseDate) : null,
    openHouseSchedule: undefined,
    schoolDistrict,
    elementarySchoolDistrict: reso.ElementarySchoolDistrict ?? null,
    middleSchoolDistrict: reso.MiddleOrJuniorSchoolDistrict ?? null,
    highSchoolDistrict: reso.HighSchoolDistrict ?? null,
    elementarySchool: reso.ElementarySchool ?? null,
    middleSchool: reso.MiddleOrJuniorSchool ?? null,
    highSchool: reso.HighSchool ?? null,
    listingAgentName: reso.ListAgentFullName ?? null,
    listingAgentMlsId: normalizeMlsAgentId(reso.ListAgentMlsId),
    listingAgentPhone: reso.ListAgentDirectPhone ?? null,
    listingAgentEmail: reso.ListAgentEmail ?? null,
    listingOfficeName: reso.ListOfficeName ?? null,
    listingOfficeMlsId: reso.ListOfficeMlsId ?? null,
    virtualTourUrl: reso.VirtualTourURLUnbranded ?? null,
    featured: isHomewiseOffice(reso.ListOfficeMlsId),
    mlgCanUse: reso.MlgCanUse ?? [],
    mlsLastModified: new Date(reso.ModificationTimestamp),
    syncedAt: new Date(),
  };
}
