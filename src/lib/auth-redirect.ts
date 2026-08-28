export const DEFAULT_AUTH_REDIRECT = "/dashboard";

const INTERNAL_ORIGIN = "https://homewise.invalid";
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/;

function hasUnsafeDecodedPath(value: string): boolean {
  let path = value.split(/[?#]/, 1)[0] ?? "";

  for (let i = 0; i < 5; i += 1) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      return true;
    }

    if (decoded === path) break;
    path = decoded;
  }

  return (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    path.includes("\\") ||
    CONTROL_CHARACTER.test(path)
  );
}

/**
 * Return a normalized same-origin path for an authentication redirect.
 * Absolute URLs, protocol-relative URLs, backslashes, and control characters
 * fall back to the supplied safe path.
 */
export function safeAuthRedirectPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTH_REDIRECT,
): string {
  if (
    !value ||
    value.length > 2_048 ||
    CONTROL_CHARACTER.test(value) ||
    hasUnsafeDecodedPath(value)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(value, INTERNAL_ORIGIN);
    if (parsed.origin !== INTERNAL_ORIGIN) return fallback;
    if (hasUnsafeDecodedPath(parsed.pathname)) return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
