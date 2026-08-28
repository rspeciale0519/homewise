export function resolveTrustedReturnUrl(
  target: string | undefined,
  fallbackPath: string,
  siteUrl: string,
): string | null {
  const site = new URL(siteUrl);

  if (!target) {
    return new URL(fallbackPath, site).toString();
  }

  try {
    const resolved = target.startsWith("/")
      ? new URL(target, site)
      : new URL(target);

    if (resolved.origin !== site.origin) {
      return null;
    }

    return resolved.toString();
  } catch {
    return null;
  }
}
