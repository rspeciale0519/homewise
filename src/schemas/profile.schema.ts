import { z } from "zod";

export const profileSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be 50 characters or less"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be 50 characters or less"),
  phone: z
    .string()
    .max(20, "Phone number must be 20 characters or less")
    .optional()
    .or(z.literal("")),
  preferredAgent: z.string().nullable().optional(),
});

export type ProfileInput = z.infer<typeof profileSchema>;
