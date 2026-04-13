export const RESERVED_SLUGS = new Set([
  "new",
  "edit",
  "admin",
  "api",
  "dashboard",
  "login",
  "logout",
  "settings",
  "profile",
  "search",
  "courses",
  "category",
  "by-slug",
]);

const MAX_SLUG_LENGTH = 80;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function slugify(input: string): string {
  const base = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base.slice(0, MAX_SLUG_LENGTH).replace(/-+$/, "");
}

export function isValidSlug(slug: string): boolean {
  if (!slug) return false;
  if (slug.length > MAX_SLUG_LENGTH) return false;
  if (!SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug)) return false;
  return true;
}

export function slugValidationError(slug: string): string | null {
  if (!slug) return "Slug is required";
  if (slug.length > MAX_SLUG_LENGTH) {
    return `Slug must be ${MAX_SLUG_LENGTH} characters or fewer`;
  }
  if (!SLUG_PATTERN.test(slug)) {
    return "Use lowercase letters, numbers, and single hyphens only";
  }
  if (RESERVED_SLUGS.has(slug)) {
    return `"${slug}" is reserved — choose a different slug`;
  }
  return null;
}

export async function generateUniqueSlug(
  base: string,
  existsFn: (candidate: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const seed = slugify(base) || "item";
  const safeSeed = RESERVED_SLUGS.has(seed) ? `${seed}-1` : seed;

  if (!(await existsFn(safeSeed))) return safeSeed;

  for (let i = 2; i <= maxAttempts; i++) {
    const candidate = `${safeSeed}-${i}`;
    if (!(await existsFn(candidate))) return candidate;
  }

  const suffix = Math.random().toString(36).slice(2, 8);
  return `${safeSeed}-${suffix}`;
}
