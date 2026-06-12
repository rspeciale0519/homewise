import { prisma } from "@/lib/prisma";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { withIdx } from "@/lib/mls-visibility";
import {
  LISTING_PROPERTY_SELECT,
  type ListingPropertyRow,
} from "@/lib/listing-selects";
import type {
  PropertyProvider,
  PropertyFilters,
  PropertySearchResult,
  Property,
  OpenHouseSlot,
} from "./property-provider";
import { Prisma } from "@prisma/client";

export class StellarMlsProvider implements PropertyProvider {
  async search(filters: PropertyFilters): Promise<PropertySearchResult> {
    const {
      page = 1,
      perPage = 12,
      location,
      minPrice,
      maxPrice,
      beds,
      baths,
      minSqft,
      maxSqft,
      propertyType,
      status,
      bounds,
      minYearBuilt,
      maxYearBuilt,
      minLotSize,
      maxLotSize,
      maxHoa,
      maxDom,
      hasPool,
      hasWaterfront,
      hasGarage,
      isNewConstruction,
      hasGatedCommunity,
      openHousesOnly,
      schoolDistrict,
      featured,
      listingAgentMlsId,
      listingOfficeMlsId,
      sortBy = "price_desc",
    } = filters;

    const where: Prisma.ListingWhereInput = withIdx();

    if (location) {
      const q = location.toLowerCase();
      where.OR = [
        { city: { contains: q, mode: "insensitive" } },
        { address: { contains: q, mode: "insensitive" } },
        { zip: { contains: q } },
      ];
    }

    if (minPrice !== undefined) where.price = { ...((where.price as Prisma.FloatFilter) ?? {}), gte: minPrice };
    if (maxPrice !== undefined) where.price = { ...((where.price as Prisma.FloatFilter) ?? {}), lte: maxPrice };
    if (beds !== undefined) where.beds = { gte: beds };
    if (baths !== undefined) where.baths = { gte: baths };
    if (minSqft !== undefined) where.sqft = { ...((where.sqft as Prisma.IntFilter) ?? {}), gte: minSqft };
    if (maxSqft !== undefined) where.sqft = { ...((where.sqft as Prisma.IntFilter) ?? {}), lte: maxSqft };
    if (propertyType) where.propertyType = propertyType;
    if (status) where.status = status;
    if (featured !== undefined) where.featured = featured;
    const normalizedAgentMlsId = normalizeMlsAgentId(listingAgentMlsId);
    if (normalizedAgentMlsId) where.listingAgentMlsId = normalizedAgentMlsId;
    if (listingOfficeMlsId) where.listingOfficeMlsId = listingOfficeMlsId;

    if (bounds) {
      where.latitude = { gte: bounds.south, lte: bounds.north };
      where.longitude = { gte: bounds.west, lte: bounds.east };
    }

    if (minYearBuilt !== undefined) where.yearBuilt = { ...((where.yearBuilt as Prisma.IntNullableFilter) ?? {}), gte: minYearBuilt };
    if (maxYearBuilt !== undefined) where.yearBuilt = { ...((where.yearBuilt as Prisma.IntNullableFilter) ?? {}), lte: maxYearBuilt };
    if (minLotSize !== undefined) where.lotSize = { ...((where.lotSize as Prisma.FloatNullableFilter) ?? {}), gte: minLotSize };
    if (maxLotSize !== undefined) where.lotSize = { ...((where.lotSize as Prisma.FloatNullableFilter) ?? {}), lte: maxLotSize };
    if (maxHoa !== undefined) where.hoaFee = { lte: maxHoa };
    if (maxDom !== undefined) where.daysOnMarket = { lte: maxDom };
    if (hasPool) where.hasPool = true;
    if (hasWaterfront) where.hasWaterfront = true;
    if (hasGarage) where.hasGarage = true;
    if (isNewConstruction) where.isNewConstruction = true;
    if (hasGatedCommunity) where.hasGatedCommunity = true;
    if (schoolDistrict) where.schoolDistrict = { contains: schoolDistrict, mode: "insensitive" };

    if (openHousesOnly) {
      where.openHouseSchedule = { not: Prisma.JsonNull };
    }

    // Polygon search: point-in-polygon test
    if (filters.polygon && filters.polygon.length >= 3) {
      const polyIds = await filterByPolygon(filters.polygon, where);
      if (polyIds.length === 0) {
        return { properties: [], total: 0, totalPages: 0, currentPage: page };
      }
      where.id = { in: polyIds };
    }

    const orderBy = buildOrderBy(sortBy);

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: LISTING_PROPERTY_SELECT,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.listing.count({ where }),
    ]);

    const properties = listings.map(mapListingToProperty);
    const totalPages = Math.ceil(total / perPage);

    return { properties, total, totalPages, currentPage: page };
  }

  async getProperty(id: string): Promise<Property | null> {
    const listing = await prisma.listing.findFirst({
      where: withIdx({ OR: [{ id }, { mlsId: id }] }),
      select: LISTING_PROPERTY_SELECT,
    });
    if (!listing) return null;
    return mapListingToProperty(listing);
  }
}

async function filterByPolygon(
  polygon: [number, number][],
  baseWhere: Prisma.ListingWhereInput,
): Promise<string[]> {
  const { north, south, east, west } = polygonBounds(polygon);
  const candidates = await prisma.listing.findMany({
    where: {
      AND: [
        baseWhere,
        {
          latitude: { gte: south, lte: north },
          longitude: { gte: west, lte: east },
        },
      ],
    },
    select: { id: true, latitude: true, longitude: true },
  });

  return candidates
    .filter((c) => pointInPolygon([c.longitude!, c.latitude!], polygon))
    .map((c) => c.id);
}

function polygonBounds(polygon: [number, number][]) {
  const lngs = polygon.map(([lng]) => lng);
  const lats = polygon.map(([, lat]) => lat);
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs),
  };
}

function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]!;
    const pj = polygon[j]!;
    const [xi, yi] = pi;
    const [xj, yj] = pj;
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function buildOrderBy(sortBy: string): Prisma.ListingOrderByWithRelationInput {
  switch (sortBy) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "newest":
      return { createdAt: "desc" };
    case "dom_asc":
      return { daysOnMarket: "asc" };
    case "dom_desc":
      return { daysOnMarket: "desc" };
    case "sqft_desc":
      return { sqft: "desc" };
    default:
      return { price: "desc" };
  }
}

function mapListingToProperty(listing: ListingPropertyRow): Property {
  const openHouse = listing.openHouseSchedule as OpenHouseSlot[] | null;

  return {
    id: listing.id,
    mlsId: listing.mlsId,
    mlsSource: listing.mlsSource,
    listingId: listing.listingId ?? undefined,
    price: listing.price,
    closePrice: listing.closePrice ?? undefined,
    originalListPrice: listing.originalListPrice ?? undefined,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    county: listing.county ?? undefined,
    subdivision: listing.subdivision ?? undefined,
    beds: listing.beds,
    baths: listing.baths,
    sqft: listing.sqft,
    garage: listing.garageSpaces,
    propertyType: listing.propertyType,
    status: listing.status,
    imageUrl: listing.imageUrl ?? listing.photos[0] ?? "",
    daysOnMarket: listing.daysOnMarket,
    description: listing.description ?? undefined,
    photos: listing.photos,
    yearBuilt: listing.yearBuilt ?? undefined,
    lotSize: listing.lotSize ?? undefined,
    latitude: listing.latitude ?? undefined,
    longitude: listing.longitude ?? undefined,
    hoaFee: listing.hoaFee ?? undefined,
    hoaFrequency: listing.hoaFrequency ?? undefined,
    taxAmount: listing.taxAmount ?? undefined,
    taxYear: listing.taxYear ?? undefined,
    hasPool: listing.hasPool,
    hasWaterfront: listing.hasWaterfront,
    hasGarage: listing.hasGarage,
    isNewConstruction: listing.isNewConstruction,
    hasGatedCommunity: listing.hasGatedCommunity,
    openHouseSchedule: openHouse ?? undefined,
    schoolDistrict: listing.schoolDistrict ?? undefined,
    elementarySchool: listing.elementarySchool ?? undefined,
    middleSchool: listing.middleSchool ?? undefined,
    highSchool: listing.highSchool ?? undefined,
    listingAgentName: listing.listingAgentName ?? undefined,
    listingAgentMlsId: listing.listingAgentMlsId ?? undefined,
    listingAgentPhone: listing.listingAgentPhone ?? undefined,
    listingAgentEmail: listing.listingAgentEmail ?? undefined,
    listingOfficeName: listing.listingOfficeName ?? undefined,
    listingOfficeMlsId: listing.listingOfficeMlsId ?? undefined,
    walkScore: listing.walkScore ?? undefined,
    transitScore: listing.transitScore ?? undefined,
    bikeScore: listing.bikeScore ?? undefined,
    featured: listing.featured,
    virtualTourUrl: listing.virtualTourUrl ?? undefined,
    listDate: listing.listDate?.toISOString() ?? undefined,
    closeDate: listing.closeDate?.toISOString() ?? undefined,
    remarks: listing.remarks ?? undefined,
  };
}
