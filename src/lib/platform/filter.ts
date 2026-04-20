import { platformSchema, type Platform } from "@/schemas/platform.schema";

export type { Platform };

export function platformFilter(platform: Platform = "homewise") {
  return { platforms: { has: platform } };
}

export function resolveAgentPlatform(agent: { platform: string } | null): Platform {
  if (!agent) return "homewise";
  const parsed = platformSchema.safeParse(agent.platform);
  return parsed.success ? parsed.data : "homewise";
}
