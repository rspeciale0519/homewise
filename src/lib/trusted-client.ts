import { isIP } from "node:net";

export const MAX_STORED_IP_LENGTH = 45;
export const MAX_STORED_USER_AGENT_LENGTH = 512;

export function boundedStoredValue(value: string | null, maxLength: number): string | null {
  if (!value || !Number.isInteger(maxLength) || maxLength < 1) return null;

  const sanitized = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return sanitized ? sanitized.slice(0, maxLength) : null;
}

export function trustedClientIp(request: Request): string | null {
  if (process.env.VERCEL !== "1") return null;

  const forwarded = request.headers.get("x-vercel-forwarded-for");
  const address = forwarded?.split(",", 1)[0]?.trim() ?? "";
  if (address.length > MAX_STORED_IP_LENGTH || isIP(address) === 0) {
    return null;
  }

  return address;
}

export function boundedUserAgent(request: Request): string | null {
  return boundedStoredValue(
    request.headers.get("user-agent"),
    MAX_STORED_USER_AGENT_LENGTH,
  );
}
