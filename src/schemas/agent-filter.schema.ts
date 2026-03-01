import { z } from "zod";

export const agentFilterSchema = z.object({
  language: z.string().optional(),
  letter: z
    .string()
    .length(1)
    .regex(/^[A-Za-z]$/)
    .optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().positive().default(1),
});

export type AgentFilterInput = z.infer<typeof agentFilterSchema>;
