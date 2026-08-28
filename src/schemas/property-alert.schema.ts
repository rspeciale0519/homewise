import { z } from "zod";

export const propertyAlertSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email must be under 255 characters"),
  name: z
    .string()
    .max(100, "Name must be under 100 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  cities: z.array(z.string().trim().min(1).max(100)).min(1, "Select at least one area").max(20),
  minPrice: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  maxPrice: z.coerce.number().finite().min(0).max(1_000_000_000).optional(),
  beds: z.coerce.number().finite().min(0).max(10).optional(),
}).strict().refine(
  (data) => data.minPrice === undefined || data.maxPrice === undefined || data.minPrice <= data.maxPrice,
  { message: "Minimum price cannot exceed maximum price", path: ["minPrice"] },
);

export type PropertyAlertInput = z.infer<typeof propertyAlertSchema>;

export const ALERT_CITIES = [
  "Altamonte Springs",
  "Apopka",
  "Casselberry",
  "Celebration",
  "Clermont",
  "Daytona Beach",
  "Deltona",
  "Kissimmee",
  "Lake Mary",
  "Longwood",
  "Ocoee",
  "Orlando",
  "Oviedo",
  "Sanford",
  "Winter Park",
  "Winter Springs",
  "Windermere",
] as const;
