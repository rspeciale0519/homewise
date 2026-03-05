/**
 * Shared fetch helper for admin API calls.
 * Returns parsed JSON on success, throws on error.
 */
export async function adminFetch<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = (body as { error?: string }).error ?? `Request failed (${res.status})`;
    throw new Error(message);
  }

  return res.json() as Promise<T>;
}
