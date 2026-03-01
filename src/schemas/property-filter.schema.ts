import { z } from "zod";

export const propertyFilterSchema = z.object({
  location: z.string().max(100).optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().min(0).max(10).optional(),
  baths: z.coerce.number().min(0).max(10).optional(),
  minSqft: z.coerce.number().min(0).optional(),
  maxSqft: z.coerce.number().min(0).optional(),
  propertyType: z.string().optional(),
  status: z.string().optional(),
  page: z.coerce.number().min(1).default(1),
  perPage: z.coerce.number().min(1).max(48).default(12),
});

export type PropertyFilterInput = z.input<typeof propertyFilterSchema>;
export type PropertyFilterParsed = z.output<typeof propertyFilterSchema>;

export const PROPERTY_TYPES = [
  "Single Family",
  "Townhome",
  "Condo",
  "Villa",
] as const;

export const LISTING_STATUSES = [
  "For Sale",
  "Pending",
  "New Listing",
] as const;

export const PRICE_RANGES = [
  { label: "Under $300k", min: 0, max: 300_000 },
  { label: "$300k – $500k", min: 300_000, max: 500_000 },
  { label: "$500k – $750k", min: 500_000, max: 750_000 },
  { label: "$750k – $1M", min: 750_000, max: 1_000_000 },
  { label: "$1M+", min: 1_000_000, max: undefined },
] as const;

export const BED_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "5+", value: "5" },
] as const;

export const BATH_OPTIONS = [
  { label: "Any", value: "" },
  { label: "1+", value: "1" },
  { label: "2+", value: "2" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
] as const;
