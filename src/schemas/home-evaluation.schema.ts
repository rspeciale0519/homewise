import { z } from "zod";

export const homeEvaluationSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .email("Please enter a valid email address")
    .max(255, "Email must be under 255 characters")
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .regex(/^[\d\s()+-]{7,20}$/, "Please enter a valid phone number"),
  streetAddress: z
    .string()
    .min(5, "Street address must be at least 5 characters")
    .max(200, "Street address must be under 200 characters")
    .trim(),
  city: z
    .string()
    .min(2, "City must be at least 2 characters")
    .max(100, "City must be under 100 characters")
    .trim(),
  state: z.string().length(2, "State must be a 2-letter code").default("FL"),
  zip: z
    .string()
    .regex(/^\d{5}(-\d{4})?$/, "Please enter a valid ZIP code"),
  bedrooms: z.coerce.number().int().min(0).max(20).optional(),
  bathrooms: z.coerce.number().min(0).max(20).optional(),
  sqft: z.coerce.number().int().min(100).max(50000).optional(),
  garageSpaces: z.coerce.number().int().min(0).max(10).optional(),
  propertyType: z
    .enum(["Single Family", "Townhome", "Condo", "Villa", "Multi-Family", "Land"])
    .optional(),
  sellTimeline: z
    .enum(["ASAP", "1-3 months", "3-6 months", "6-12 months", "12+ months", "Just curious"])
    .optional(),
  listingStatus: z
    .enum(["Not listed", "Listed with another agent", "Expired listing", "For Sale By Owner"])
    .optional(),
  comments: z
    .string()
    .max(2000, "Comments must be under 2,000 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type HomeEvaluationInput = z.infer<typeof homeEvaluationSchema>;

export const PROPERTY_TYPES = [
  "Single Family",
  "Townhome",
  "Condo",
  "Villa",
  "Multi-Family",
  "Land",
] as const;

export const SELL_TIMELINES = [
  "ASAP",
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "12+ months",
  "Just curious",
] as const;

export const LISTING_STATUSES = [
  "Not listed",
  "Listed with another agent",
  "Expired listing",
  "For Sale By Owner",
] as const;
