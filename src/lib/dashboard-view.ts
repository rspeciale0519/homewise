export const DEFAULT_DASHBOARD_PATH = "/dashboard";
export const AGENT_DASHBOARD_PATH = "/dashboard/agent-hub";
export const ADMIN_DASHBOARD_PATH = "/admin";

export function resolveDashboardPath(
  profile: { role?: string | null } | null,
): string {
  if (!profile) return DEFAULT_DASHBOARD_PATH;
  if (profile.role === "admin") return ADMIN_DASHBOARD_PATH;
  if (profile.role === "agent") return AGENT_DASHBOARD_PATH;
  return DEFAULT_DASHBOARD_PATH;
}
