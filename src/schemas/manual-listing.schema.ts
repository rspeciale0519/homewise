import { z } from "zod";

export const MANUAL_LISTING_STATUSES = ["Active", "Pending"] as const;

export const manualListingCreateSchema = z.object({
  address: z.string().min(1).max(200).trim(),
  city: z.string().min(1).max(100).trim(),
  state: z.string().length(2).trim().toUpperCase().default("FL"),
  zip: z.string().min(5).max(10).trim(),
  county: z.string().max(100).trim().optional().or(z.literal("")),
  price: z.number().positive().max(1_000_000_000),
  beds: z.number().int().min(0).max(50),
  bathsFull: z.number().int().min(0).max(50),
  bathsHalf: z.number().int().min(0).max(50).default(0),
  sqft: z.number().int().min(0).max(1_000_000),
  lotSize: z.number().positive().max(1_000_000_000).optional().nullable(),
  yearBuilt: z.number().int().min(1800).max(2100).optional().nullable(),
  propertyType: z.string().min(1).max(60).trim(),
  description: z.string().max(8000).trim().optional().or(z.literal("")),
  photos: z.array(z.string().url().max(800)).max(30).default([]),
  status: z.enum(MANUAL_LISTING_STATUSES).default("Active"),
  hoaFee: z.number().min(0).max(1_000_000).optional().nullable(),
  hoaFrequency: z.string().max(30).trim().optional().or(z.literal("")),
  taxAmount: z.number().min(0).max(10_000_000).optional().nullable(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
});

export const manualListingUpdateSchema = manualListingCreateSchema.partial();

export type ManualListingCreateInput = z.infer<typeof manualListingCreateSchema>;
export type ManualListingUpdateInput = z.infer<typeof manualListingUpdateSchema>;
