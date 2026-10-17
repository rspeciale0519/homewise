const LEAD_SOURCE_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;

export function isSafeLeadSource(source: string | null | undefined): source is string {
  return typeof source === "string" && LEAD_SOURCE_PATTERN.test(source);
}
