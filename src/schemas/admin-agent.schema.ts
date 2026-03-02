import { z } from "zod";

export const adminAgentFilterSchema = z.object({
  search: z.string().max(200).optional(),
  active: z.enum(["true", "false", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminAgentFilterInput = z.infer<typeof adminAgentFilterSchema>;

export const adminAgentCreateSchema = z.object({
  firstName: z.string().min(1).max(100).trim(),
  lastName: z.string().min(1).max(100).trim(),
  email: z.string().trim().toLowerCase().email().max(255).optional().or(z.literal("")),
  phone: z.string().max(30).trim().optional().or(z.literal("")),
  photoUrl: z.string().url().max(500).optional().or(z.literal("")),
  bio: z.string().max(5000).trim().optional().or(z.literal("")),
  languages: z.array(z.string().trim()).default([]),
  designations: z.array(z.string().trim()).default([]),
  active: z.boolean().default(true),
});

export type AdminAgentCreateInput = z.infer<typeof adminAgentCreateSchema>;

export const adminAgentUpdateSchema = adminAgentCreateSchema.partial();

export type AdminAgentUpdateInput = z.infer<typeof adminAgentUpdateSchema>;
