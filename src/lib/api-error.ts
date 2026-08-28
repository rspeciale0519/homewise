const SAFE_DIAGNOSTIC_KEYS = [
  "code",
  "type",
  "status",
  "statusCode",
  "requestId",
  "request_id",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function safeDiagnostic(value: unknown): string | number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  if (value.length > 100) return undefined;

  const trimmed = value.trim();
  return /^[A-Za-z0-9_.:-]{1,100}$/.test(trimmed) ? trimmed : undefined;
}

function readProperty(
  record: Record<string, unknown>,
  key: string,
): unknown {
  try {
    return record[key];
  } catch {
    return undefined;
  }
}

export function logApiError(scope: string, error: unknown): void {
  const record = isRecord(error) ? error : {};
  const metadata: Record<string, string | number> = {};
  const name = safeDiagnostic(readProperty(record, "name"));
  if (name !== undefined) metadata.name = name;

  for (const key of SAFE_DIAGNOSTIC_KEYS) {
    const value = safeDiagnostic(readProperty(record, key));
    if (value !== undefined) metadata[key] = value;
  }

  if (Object.keys(metadata).length === 0) {
    metadata.kind = error === null ? "null" : typeof error;
  }

  console.error(`[${scope}] request failed`, metadata);
}
