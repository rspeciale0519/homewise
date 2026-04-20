import { z } from "zod";

export const platformSchema = z.enum(["homewise", "riusa"]);
export type Platform = z.infer<typeof platformSchema>;

export const platformsArraySchema = z.array(platformSchema).min(1);
