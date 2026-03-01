import { z } from "zod";

export const favoriteSchema = z.object({
  propertyId: z.string().min(1, "Property ID is required"),
  notes: z.string().max(1000, "Notes must be 1000 characters or less").optional(),
});

export type FavoriteInput = z.infer<typeof favoriteSchema>;
