export const DASHBOARD_VIEWS = ["client", "agent"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export const DASHBOARD_VIEW_PATHS: Record<DashboardView, string> = {
  client: "/dashboard",
  agent: "/dashboard/agent-hub",
};

export const DEFAULT_DASHBOARD_PATH = DASHBOARD_VIEW_PATHS.client;

export function isDashboardView(value: unknown): value is DashboardView {
  return (
    typeof value === "string" &&
    (DASHBOARD_VIEWS as readonly string[]).includes(value)
  );
}

export function resolveDashboardPath(
  profile: { role?: string | null; defaultDashboardView?: string | null } | null,
): string {
  if (!profile) return DEFAULT_DASHBOARD_PATH;
  if (profile.role !== "admin") return DEFAULT_DASHBOARD_PATH;
  const view = isDashboardView(profile.defaultDashboardView)
    ? profile.defaultDashboardView
    : "client";
  return DASHBOARD_VIEW_PATHS[view];
}
