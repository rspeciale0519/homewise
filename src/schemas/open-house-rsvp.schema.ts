import { z } from "zod";

export const openHouseRsvpSchema = z.object({
  listingId: z.string().min(1).max(64),
  openHouseKey: z.string().max(64).optional(),
  slotDate: z.string().max(64).optional(),
  name: z.string().min(1).max(120).trim(),
  email: z.string().trim().toLowerCase().email().max(255),
  phone: z.string().max(30).trim().optional().or(z.literal("")),
});

export type OpenHouseRsvpInput = z.infer<typeof openHouseRsvpSchema>;
