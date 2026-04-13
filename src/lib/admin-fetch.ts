/**
 * Shared fetch helper for admin API calls.
 * Returns parsed JSON on success, throws on error.
 */
export class AdminFetchError extends Error {
  readonly status: number;
  readonly field?: string;

  constructor(message: string, status: number, field?: string) {
    super(message);
    this.name = "AdminFetchError";
    this.status = status;
    this.field = field;
  }
}

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
    const body = (await res.json().catch(() => ({}))) as {
      error?: string;
      field?: string;
    };
    const message = body.error ?? `Request failed (${res.status})`;
    throw new AdminFetchError(message, res.status, body.field);
  }

  return res.json() as Promise<T>;
}
