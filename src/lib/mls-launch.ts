export function mlsPublicSearchEnabled(): boolean {
  return process.env.MLS_PUBLIC_SEARCH_ENABLED === "true";
}
