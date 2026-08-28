import { z } from "zod";

const MAX_POLYGON_POINTS = 500;
const MAX_POLYGON_QUERY_LENGTH = 30_000;

const optionalQueryBoolean = z.preprocess((value) => {
  if (value === undefined || value === "") return undefined;
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return value;
}, z.boolean().optional());

const polygonCoordinatesSchema = z
  .array(
    z.tuple([
      z.number().finite().min(-180).max(180),
      z.number().finite().min(-90).max(90),
    ]),
  )
  .min(3)
  .max(MAX_POLYGON_POINTS);

const polygonQuerySchema = z
  .string()
  .max(MAX_POLYGON_QUERY_LENGTH)
  .transform((value, context) => {
    let decoded: unknown;
    try {
      decoded = JSON.parse(value);
    } catch {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Polygon must be valid JSON",
      });
      return z.NEVER;
    }

    const parsed = polygonCoordinatesSchema.safeParse(decoded);
    if (!parsed.success) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Polygon must contain 3 to ${MAX_POLYGON_POINTS} valid coordinates`,
      });
      return z.NEVER;
    }

    return parsed.data;
  })
  .optional();

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
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(48).default(12),
  // Map bounds
  north: z.coerce.number().finite().min(-90).max(90).optional(),
  south: z.coerce.number().finite().min(-90).max(90).optional(),
  east: z.coerce.number().finite().min(-180).max(180).optional(),
  west: z.coerce.number().finite().min(-180).max(180).optional(),
  // Polygon (JSON-encoded array of [lng, lat] pairs)
  polygon: polygonQuerySchema,
  // Advanced filters
  minYearBuilt: z.coerce.number().min(1800).max(2030).optional(),
  maxYearBuilt: z.coerce.number().min(1800).max(2030).optional(),
  minLotSize: z.coerce.number().min(0).optional(),
  maxLotSize: z.coerce.number().min(0).optional(),
  maxHoa: z.coerce.number().min(0).optional(),
  maxDom: z.coerce.number().min(0).optional(),
  hasPool: optionalQueryBoolean,
  hasWaterfront: optionalQueryBoolean,
  hasGarage: optionalQueryBoolean,
  isNewConstruction: optionalQueryBoolean,
  hasGatedCommunity: optionalQueryBoolean,
  openHousesOnly: optionalQueryBoolean,
  schoolDistrict: z.string().optional(),
  tag: z.string().max(40).optional(),
  featured: optionalQueryBoolean,
  // Sorting
  sortBy: z.enum(["price_asc", "price_desc", "newest", "dom_asc", "dom_desc", "sqft_desc"]).optional(),
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
  "Active",
  "Coming Soon",
  "Pending",
  "Sold",
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

export const SORT_OPTIONS = [
  { label: "Price (High to Low)", value: "price_desc" },
  { label: "Price (Low to High)", value: "price_asc" },
  { label: "Newest", value: "newest" },
  { label: "Days on Market (Low)", value: "dom_asc" },
  { label: "Days on Market (High)", value: "dom_desc" },
  { label: "Sq Ft (High to Low)", value: "sqft_desc" },
] as const;
