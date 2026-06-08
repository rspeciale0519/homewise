import { createHash, createHmac, timingSafeEqual } from "crypto";

export type VerifiedMlsPhoto = {
  sourceUrl: string;
  storageKey: string;
};

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

export function storageKeyFor(sourceUrl: string): string {
  return `${createHash("sha256").update(sourceUrl).digest("hex")}.jpg`;
}

export function proxyPhotoUrl(sourceUrl: string): string {
  const payload = toBase64Url(sourceUrl);
  const sig = signPayload(payload);
  return `/api/mls-photo?u=${payload}&sig=${sig}`;
}

export function parseAndVerify(params: URLSearchParams): VerifiedMlsPhoto | null {
  const payload = params.get("u");
  const sig = params.get("sig");
  const secret = signingSecret();

  if (!payload || !sig || !secret) {
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

  const sourceUrl = fromBase64Url(payload);
  return {
    sourceUrl,
    storageKey: storageKeyFor(sourceUrl),
  };
}
