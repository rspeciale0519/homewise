import { z } from "zod";

export const adminUserFilterSchema = z.object({
  search: z.string().max(200).optional(),
  role: z.enum(["user", "agent", "admin", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminUserFilterInput = z.infer<typeof adminUserFilterSchema>;

export const adminRoleUpdateSchema = z.object({
  role: z.enum(["user", "agent", "admin"]),
});

export type AdminRoleUpdateInput = z.infer<typeof adminRoleUpdateSchema>;
