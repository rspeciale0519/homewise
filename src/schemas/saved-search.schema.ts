import { z } from "zod";

export const savedSearchSchema = z.object({
  name: z
    .string()
    .min(1, "Search name is required")
    .max(100, "Search name must be 100 characters or less"),
  filters: z.record(z.unknown()),
});

export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
