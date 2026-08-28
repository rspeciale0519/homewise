import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const TOKEN_VERSION = 1 as const;
const MAX_TOKEN_LENGTH = 2_048;
const MIN_SECRET_BYTES = 32;
const DEFAULT_CONFIRM_TTL_SECONDS = 24 * 60 * 60;
const PUBLIC_EXAMPLE_SECRET = "replace-with-at-least-32-random-characters";

const unsubscribeTargetSchema = z.object({
  kind: z.enum(["property_alert", "saved_search", "contact", "user"]),
  id: z.string().trim().min(1).max(191),
}).strict();

const propertyAlertConfirmationSchema = z.object({
  version: z.literal(TOKEN_VERSION),
  purpose: z.literal("property_alert_confirmation"),
  subjectId: z.string().trim().min(1).max(191),
  recipientBinding: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  verificationVersion: z.number().int().nonnegative().safe(),
  issuedAt: z.number().int().nonnegative().safe(),
  expiresAt: z.number().int().positive().safe(),
}).strict();

const unsubscribeSchema = z.object({
  version: z.literal(TOKEN_VERSION),
  purpose: z.literal("unsubscribe"),
  target: unsubscribeTargetSchema,
  recipientBinding: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  issuedAt: z.number().int().nonnegative().safe(),
}).strict();

const emailActionSchema = z.discriminatedUnion("purpose", [
  propertyAlertConfirmationSchema,
  unsubscribeSchema,
]);

export type UnsubscribeTarget = z.infer<typeof unsubscribeTargetSchema>;
export type EmailAction = z.infer<typeof emailActionSchema>;
export type EmailActionPurpose = EmailAction["purpose"];
export type PropertyAlertConfirmationAction = z.infer<typeof propertyAlertConfirmationSchema>;
export type UnsubscribeAction = z.infer<typeof unsubscribeSchema>;

interface TokenOptions {
  now?: number;
  secret?: string;
}

interface ConfirmationTokenOptions extends TokenOptions {
  ttlSeconds?: number;
}

interface PropertyAlertConfirmationInput {
  alertId: string;
  email: string;
  verificationVersion: number;
}

export class EmailActionTokenError extends Error {
  constructor() {
    super("The email action link is invalid or expired.");
    this.name = "EmailActionTokenError";
  }
}

function getSecret(override?: string): string {
  const secret = override ?? process.env.EMAIL_ACTION_SECRET;
  if (
    !secret
    || secret === PUBLIC_EXAMPLE_SECRET
    || Buffer.byteLength(secret, "utf8") < MIN_SECRET_BYTES
  ) {
    throw new Error(`EMAIL_ACTION_SECRET must contain at least ${MIN_SECRET_BYTES} bytes.`);
  }
  return secret;
}

export function assertEmailActionSecretConfigured(secretOverride?: string): void {
  getSecret(secretOverride);
}

function hmac(value: string, secret: string): Buffer {
  return createHmac("sha256", secret).update(value, "utf8").digest();
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function recipientBinding(email: string, secret: string): string {
  return hmac(`recipient:${normalizeEmail(email)}`, secret).toString("base64url");
}

function createToken(action: EmailAction, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(action), "utf8").toString("base64url");
  return `${encodedPayload}.${hmac(encodedPayload, secret).toString("base64url")}`;
}

export function createPropertyAlertConfirmationToken(
  input: PropertyAlertConfirmationInput,
  options: ConfirmationTokenOptions = {},
): string {
  const secret = getSecret(options.secret);
  const issuedAt = Math.floor((options.now ?? Date.now()) / 1_000);
  const ttlSeconds = options.ttlSeconds ?? DEFAULT_CONFIRM_TTL_SECONDS;
  if (!Number.isSafeInteger(ttlSeconds) || ttlSeconds <= 0) {
    throw new Error("The email action token lifetime must be a positive integer.");
  }

  const action = propertyAlertConfirmationSchema.parse({
    version: TOKEN_VERSION,
    purpose: "property_alert_confirmation",
    subjectId: input.alertId,
    recipientBinding: recipientBinding(input.email, secret),
    verificationVersion: input.verificationVersion,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  });
  return createToken(action, secret);
}

export function createUnsubscribeToken(
  target: UnsubscribeTarget,
  email: string,
  options: TokenOptions = {},
): string {
  const secret = getSecret(options.secret);
  const action = unsubscribeSchema.parse({
    version: TOKEN_VERSION,
    purpose: "unsubscribe",
    target: unsubscribeTargetSchema.parse(target),
    recipientBinding: recipientBinding(email, secret),
    issuedAt: Math.floor((options.now ?? Date.now()) / 1_000),
  });
  return createToken(action, secret);
}

function decodeCanonicalBase64Url(value: string): Buffer {
  const decoded = Buffer.from(value, "base64url");
  if (!value || decoded.toString("base64url") !== value) throw new EmailActionTokenError();
  return decoded;
}

export function verifyEmailActionToken(
  token: string,
  expectedPurpose: "property_alert_confirmation",
  options?: TokenOptions,
): PropertyAlertConfirmationAction;
export function verifyEmailActionToken(
  token: string,
  expectedPurpose: "unsubscribe",
  options?: TokenOptions,
): UnsubscribeAction;
export function verifyEmailActionToken(
  token: string,
  expectedPurpose: EmailActionPurpose,
  options: TokenOptions = {},
): EmailAction {
  if (!token || token.length > MAX_TOKEN_LENGTH) throw new EmailActionTokenError();

  const parts = token.split(".");
  if (parts.length !== 2) throw new EmailActionTokenError();
  const [encodedPayload, encodedSignature] = parts;
  if (!encodedPayload || !encodedSignature) throw new EmailActionTokenError();

  const suppliedSignature = decodeCanonicalBase64Url(encodedSignature);
  const expectedSignature = hmac(encodedPayload, getSecret(options.secret));
  if (
    suppliedSignature.length !== expectedSignature.length
    || !timingSafeEqual(suppliedSignature, expectedSignature)
  ) {
    throw new EmailActionTokenError();
  }

  let decoded: unknown;
  try {
    decoded = JSON.parse(decodeCanonicalBase64Url(encodedPayload).toString("utf8")) as unknown;
  } catch (error) {
    if (error instanceof EmailActionTokenError) throw error;
    throw new EmailActionTokenError();
  }

  const parsed = emailActionSchema.safeParse(decoded);
  if (!parsed.success || parsed.data.purpose !== expectedPurpose) {
    throw new EmailActionTokenError();
  }

  const nowSeconds = Math.floor((options.now ?? Date.now()) / 1_000);
  if (parsed.data.issuedAt > nowSeconds + 300) throw new EmailActionTokenError();
  if (
    parsed.data.purpose === "property_alert_confirmation"
    && parsed.data.expiresAt <= nowSeconds
  ) {
    throw new EmailActionTokenError();
  }

  return parsed.data;
}

export function emailActionMatchesRecipient(
  action: EmailAction,
  email: string,
  secretOverride?: string,
): boolean {
  const expected = Buffer.from(recipientBinding(email, getSecret(secretOverride)), "base64url");
  const supplied = Buffer.from(action.recipientBinding, "base64url");
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
