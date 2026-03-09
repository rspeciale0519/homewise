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

export const adminUserCreateSchema = z.object({
  email: z.string().email().max(255),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  phone: z.string().max(30).optional(),
  role: z.enum(["user", "agent", "admin"]).default("user"),
});

export type AdminUserCreateInput = z.infer<typeof adminUserCreateSchema>;

export const adminUserUpdateSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(30).nullable().optional(),
  role: z.enum(["user", "agent", "admin"]).optional(),
});

export type AdminUserUpdateInput = z.infer<typeof adminUserUpdateSchema>;
