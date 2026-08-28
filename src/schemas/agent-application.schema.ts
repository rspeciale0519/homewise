import { z } from "zod";

export const agentApplicationSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(100, "First name must be under 100 characters")
    .trim(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(100, "Last name must be under 100 characters")
    .trim(),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Please enter a valid email address")
    .max(255, "Email must be under 255 characters"),
  phone: z
    .string()
    .regex(/^[\d\s()+-]{7,20}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  licenseNumber: z
    .string()
    .max(50, "License number must be under 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  hasMlsAccess: z.boolean(),
  mlsAgentId: z
    .string()
    .max(50, "MLS Agent ID must be under 50 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  message: z
    .string()
    .max(2000, "Message must be under 2,000 characters")
    .trim()
    .optional()
    .or(z.literal("")),
  // Honeypot — must stay empty; bots tend to fill every field.
  company: z.string().max(0).optional().or(z.literal("")),
}).strict();

export type AgentApplicationInput = z.infer<typeof agentApplicationSchema>;

export const adminApplicationFilterSchema = z.object({
  search: z.string().max(200).optional(),
  status: z.enum(["pending", "approved", "rejected", "all"]).default("all"),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

export type AdminApplicationFilterInput = z.infer<typeof adminApplicationFilterSchema>;

export const applicationReviewSchema = z.object({
  notes: z.string().max(2000).trim().optional().or(z.literal("")),
});

export type ApplicationReviewInput = z.infer<typeof applicationReviewSchema>;
