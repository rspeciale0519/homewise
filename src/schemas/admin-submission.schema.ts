import { z } from "zod";

export const adminSubmissionFilterSchema = z.object({
  type: z.enum(["contact", "evaluation", "buyer", "all"]).default("all"),
  status: z.enum(["new", "read", "archived", "all"]).default("all"),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminSubmissionFilterInput = z.infer<typeof adminSubmissionFilterSchema>;

export const adminSubmissionStatusSchema = z.object({
  status: z.enum(["new", "read", "archived"]),
});

export type AdminSubmissionStatusInput = z.infer<typeof adminSubmissionStatusSchema>;
