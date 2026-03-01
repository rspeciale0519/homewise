import { z } from "zod";

export const buyerRequestSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email must be under 255 characters"),
  phone: z
    .string()
    .regex(/^[\d\s()+-]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  areasOfInterest: z
    .string()
    .max(500, "Areas must be under 500 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().min(0).max(10).optional(),
  baths: z.coerce.number().min(0).max(10).optional(),
  propertyTypes: z.array(z.string()).optional().default([]),
  timeline: z
    .string()
    .max(100)
    .optional()
    .or(z.literal("")),
  comments: z
    .string()
    .max(2000, "Comments must be under 2,000 characters")
    .trim()
    .optional()
    .or(z.literal("")),
});

export type BuyerRequestInput = z.infer<typeof buyerRequestSchema>;

export const BUYER_TIMELINES = [
  "Immediately",
  "Within 1 month",
  "1–3 months",
  "3–6 months",
  "6+ months",
  "Just browsing",
] as const;
