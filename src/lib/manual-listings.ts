import { randomUUID } from "crypto";
import type { Prisma } from "@prisma/client";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import type { ManualListingCreateInput } from "@/schemas/manual-listing.schema";

export const MANUAL_SOURCE = "manual";

export type ManualListingAgent = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  mlsAgentId: string | null;
};

export function manualListingCreateData(
  input: ManualListingCreateInput,
  agent: ManualListingAgent,
): Prisma.ListingUncheckedCreateInput {
  return {
    mlsId: `MANUAL-${randomUUID()}`,
    mlsSource: MANUAL_SOURCE,
    manualStatus: "pending",
    createdByAgentId: agent.id,
    status: input.status,
    price: input.price,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    county: input.county || null,
    beds: input.beds,
    bathsFull: input.bathsFull,
    bathsHalf: input.bathsHalf,
    baths: input.bathsFull + input.bathsHalf * 0.5,
    sqft: input.sqft,
    lotSize: input.lotSize ?? null,
    yearBuilt: input.yearBuilt ?? null,
    propertyType: input.propertyType,
    description: input.description || null,
    photos: input.photos,
    photoSources: [],
    imageUrl: input.photos[0] ?? null,
    hoaFee: input.hoaFee ?? null,
    hoaFrequency: input.hoaFrequency || null,
    taxAmount: input.taxAmount ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    listDate: new Date(),
    listingAgentName: `${agent.firstName} ${agent.lastName}`,
    listingAgentMlsId: normalizeMlsAgentId(agent.mlsAgentId),
    listingAgentPhone: agent.phone,
    listingAgentEmail: agent.email,
    listingOfficeName: "Home Wise Realty Group",
    mlgCanUse: [],
    syncedAt: new Date(),
  };
}

export const MANUAL_LISTING_SELECT = {
  id: true,
  mlsId: true,
  manualStatus: true,
  status: true,
  price: true,
  address: true,
  city: true,
  state: true,
  zip: true,
  county: true,
  beds: true,
  bathsFull: true,
  bathsHalf: true,
  baths: true,
  sqft: true,
  lotSize: true,
  yearBuilt: true,
  propertyType: true,
  description: true,
  photos: true,
  imageUrl: true,
  hoaFee: true,
  hoaFrequency: true,
  taxAmount: true,
  latitude: true,
  longitude: true,
  createdAt: true,
  updatedAt: true,
  createdByAgentId: true,
} as const;
