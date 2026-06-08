const DEFAULT_SITE_URL = "https://homewisefl.com";

export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_SITE_URL).replace(/\/+$/, "");
}

export function toAbsoluteSiteUrl(
  value: string | null | undefined,
  baseUrl = getSiteUrl(),
): string | null {
  if (!value) return null;

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = value.startsWith("/") ? value : `/${value}`;
  return `${normalizedBase}${normalizedPath}`;
}
