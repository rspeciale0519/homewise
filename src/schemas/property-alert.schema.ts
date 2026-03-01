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
  cities: z.array(z.string()).min(1, "Select at least one area"),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  beds: z.coerce.number().min(0).max(10).optional(),
});

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
