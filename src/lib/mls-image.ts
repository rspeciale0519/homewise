import { createHash, createHmac, timingSafeEqual } from "crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export type VerifiedMlsPhoto = {
  sourceUrl: string;
  storageKey: string;
};

const DEFAULT_GRID_BASE_URL = "https://api.mlsgrid.com/v2";
const MAX_SOURCE_URL_BYTES = 8_192;
const SIGNATURE_PATTERN = /^[a-f0-9]{64}$/;

function normalizeHostname(hostname: string): string {
  return hostname.trim().toLowerCase().replace(/\.$/, "");
}

function configuredMediaHosts(): Set<string> {
  const hosts = new Set<string>();

  for (const entry of (process.env.MLS_MEDIA_ALLOWED_HOSTS ?? "").split(",")) {
    const hostname = normalizeHostname(entry);
    if (
      hostname &&
      hostname.length <= 253 &&
      !hostname.includes("/") &&
      !hostname.includes(":") &&
      isIP(hostname) === 0
    ) {
      hosts.add(hostname);
    }
  }

  return hosts;
}

function providerMediaHost(): string | null {
  try {
    const base = new URL(process.env.MLS_GRID_BASE_URL ?? DEFAULT_GRID_BASE_URL);
    const hostname = normalizeHostname(base.hostname);

    if (
      base.protocol !== "https:" ||
      !/^api(?:-[a-z0-9-]+)?\.mlsgrid\.com$/.test(hostname)
    ) {
      return null;
    }

    return hostname.replace(/^api(?=\.|-)/, "media");
  } catch {
    return null;
  }
}

export function allowedMlsMediaHosts(): ReadonlySet<string> {
  const configured = configuredMediaHosts();
  if (configured.size > 0) {
    return configured;
  }

  const hosts = new Set(["photos.stellarmls.com"]);
  const providerHost = providerMediaHost();
  if (providerHost) {
    hosts.add(providerHost);
  }
  return hosts;
}

function ipv4Octets(address: string): number[] | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;

  const octets = parts.map((part) => Number(part));
  return octets.every(
    (octet) => Number.isInteger(octet) && octet >= 0 && octet <= 255,
  )
    ? octets
    : null;
}

function isPublicIpv4(address: string): boolean {
  const octets = ipv4Octets(address);
  if (!octets) return false;

  const [first, second] = octets;
  if (first === undefined || second === undefined) return false;

  return !(
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    first >= 224
  );
}

function ipv6Bytes(address: string): number[] | null {
  const withoutZone = address.toLowerCase().split("%", 1)[0];
  if (!withoutZone) return null;

  let normalized = withoutZone;
  const lastColon = normalized.lastIndexOf(":");
  const ipv4Tail = normalized.slice(lastColon + 1);
  if (ipv4Tail.includes(".")) {
    const octets = ipv4Octets(ipv4Tail);
    if (!octets) return null;
    const firstPair = ((octets[0] ?? 0) << 8) | (octets[1] ?? 0);
    const secondPair = ((octets[2] ?? 0) << 8) | (octets[3] ?? 0);
    normalized = `${normalized.slice(0, lastColon)}:${firstPair.toString(16)}:${secondPair.toString(16)}`;
  }

  const halves = normalized.split("::");
  if (halves.length > 2) return null;

  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return null;

  const groups = [...left, ...Array.from({ length: missing }, () => "0"), ...right];
  if (groups.length !== 8 || groups.some((group) => !/^[a-f0-9]{1,4}$/.test(group))) {
    return null;
  }

  return groups.flatMap((group) => {
    const value = Number.parseInt(group, 16);
    return [value >> 8, value & 0xff];
  });
}

function isPublicIpv6(address: string): boolean {
  const bytes = ipv6Bytes(address);
  if (!bytes) return false;

  const isUnspecified = bytes.every((byte) => byte === 0);
  const isLoopback = bytes.slice(0, 15).every((byte) => byte === 0) && bytes[15] === 1;
  const isUniqueLocal = ((bytes[0] ?? 0) & 0xfe) === 0xfc;
  const isLinkLocal = bytes[0] === 0xfe && ((bytes[1] ?? 0) & 0xc0) === 0x80;
  const isMulticast = bytes[0] === 0xff;
  if (isUnspecified || isLoopback || isUniqueLocal || isLinkLocal || isMulticast) {
    return false;
  }

  const isIpv4Mapped =
    bytes.slice(0, 10).every((byte) => byte === 0) &&
    bytes[10] === 0xff &&
    bytes[11] === 0xff;
  if (isIpv4Mapped) {
    return isPublicIpv4(bytes.slice(12).join("."));
  }

  return true;
}

export function isPublicIpAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version === 6) return isPublicIpv6(address);
  return false;
}

export function normalizeMlsMediaUrl(sourceUrl: string): string | null {
  if (!sourceUrl || Buffer.byteLength(sourceUrl, "utf8") > MAX_SOURCE_URL_BYTES) {
    return null;
  }

  try {
    const url = new URL(sourceUrl);
    const hostname = normalizeHostname(url.hostname);

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      (url.port && url.port !== "443") ||
      isIP(hostname) !== 0 ||
      !allowedMlsMediaHosts().has(hostname)
    ) {
      return null;
    }

    url.hostname = hostname;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export async function resolvePublicMlsMediaUrl(sourceUrl: string): Promise<string | null> {
  const approvedUrl = normalizeMlsMediaUrl(sourceUrl);
  if (!approvedUrl) return null;

  try {
    const hostname = new URL(approvedUrl).hostname;
    const addresses = await lookup(hostname, { all: true, verbatim: true });
    if (addresses.length === 0 || addresses.some(({ address }) => !isPublicIpAddress(address))) {
      return null;
    }
    return approvedUrl;
  } catch {
    return null;
  }
}

function signingSecret(): string {
  return process.env.MLS_IMAGE_SIGNING_SECRET ?? "";
}

function toBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function fromBase64Url(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payload: string): string {
  const secret = signingSecret();
  if (!secret) {
    throw new Error("MLS_IMAGE_SIGNING_SECRET is required");
  }

  return createHmac("sha256", secret).update(payload).digest("hex");
}

export function canonicalMediaIdentity(sourceUrl: string): string {
  try {
    const url = new URL(sourceUrl);
    const imagesIndex = url.pathname.indexOf("/images/");
    if (imagesIndex !== -1) {
      return url.pathname.slice(imagesIndex);
    }
    return `${url.host}${url.pathname}`;
  } catch {
    return sourceUrl;
  }
}

export function storageKeyFor(sourceUrl: string): string {
  return `${createHash("sha256").update(canonicalMediaIdentity(sourceUrl)).digest("hex")}.jpg`;
}

export function proxyPhotoUrl(sourceUrl: string): string {
  const approvedUrl = normalizeMlsMediaUrl(sourceUrl);
  if (!approvedUrl) {
    throw new Error("MLS media URL is not approved");
  }

  const payload = toBase64Url(approvedUrl);
  const sig = signPayload(payload);
  return `/api/mls-photo?u=${payload}&sig=${sig}`;
}

export function parseAndVerify(params: URLSearchParams): VerifiedMlsPhoto | null {
  const payload = params.get("u");
  const sig = params.get("sig");
  const secret = signingSecret();

  if (
    !payload ||
    !sig ||
    !secret ||
    payload.length > 11_000 ||
    !SIGNATURE_PATTERN.test(sig)
  ) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(payload).digest("hex");
  const actualBuffer = Buffer.from(sig, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return null;
  }

  const sourceUrl = normalizeMlsMediaUrl(fromBase64Url(payload));
  if (!sourceUrl) return null;

  return {
    sourceUrl,
    storageKey: storageKeyFor(sourceUrl),
  };
}
