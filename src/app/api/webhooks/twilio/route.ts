import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import {
  InvalidTextBodyError,
  readTextBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";

const MAX_FORM_BYTES = 32 * 1024;
const CONTACT_PAGE_SIZE = 250;
const EMPTY_TWIML = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';
const REPLY_TWIML =
  '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your message! An agent will get back to you shortly.</Message></Response>';

function activityIdForMessage(messageSid: string): string {
  return `twilio_${createHash("sha256").update(messageSid).digest("hex")}`;
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "P2002";
}

function twimlResponse(body: string, status = 200): NextResponse {
  return new NextResponse(body, {
    status,
    headers: { "Content-Type": "text/xml" },
  });
}

function buildWebhookUrl(request: NextRequest): string {
  const proto = request.headers.get("x-forwarded-proto");
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");

  if (proto && host) {
    return `${proto}://${host}${request.nextUrl.pathname}${request.nextUrl.search}`;
  }

  return request.url;
}

function normalizeToE164Digits(phone: string): string | null {
  const trimmed = phone.trim();
  if (!/^\+?[0-9()\s.-]+$/.test(trimmed)) {
    return null;
  }

  const digits = trimmed.replace(/\D/g, "");
  const normalized = digits.length === 10 && !trimmed.startsWith("+")
    ? `1${digits}`
    : digits;

  if (
    normalized.length < 8 ||
    normalized.length > 15 ||
    normalized.startsWith("0")
  ) {
    return null;
  }

  return normalized;
}

async function findContactByExactPhone(phone: string) {
  let cursor: string | undefined;
  let matchedContactId: string | null = null;

  while (true) {
    const contacts = await prisma.contact.findMany({
      where: { phone: { not: null } },
      orderBy: { id: "asc" },
      take: CONTACT_PAGE_SIZE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, phone: true },
    });

    for (const contact of contacts) {
      if (contact.phone && normalizeToE164Digits(contact.phone) === phone) {
        if (matchedContactId && matchedContactId !== contact.id) {
          return { status: "ambiguous" as const };
        }
        matchedContactId = contact.id;
      }
    }

    if (contacts.length < CONTACT_PAGE_SIZE) {
      break;
    }
    cursor = contacts.at(-1)?.id;
    if (!cursor) {
      break;
    }
  }

  return matchedContactId
    ? { status: "found" as const, id: matchedContactId }
    : { status: "not_found" as const };
}

export async function POST(request: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const signature = request.headers.get("x-twilio-signature");

    if (!authToken) {
      console.error("[webhook/twilio] TWILIO_AUTH_TOKEN not configured");
      return new NextResponse("Webhook not configured", { status: 500 });
    }

    if (!signature) {
      return new NextResponse("Missing signature", { status: 401 });
    }

    const rawBody = await readTextBodyWithLimit(request, MAX_FORM_BYTES);
    const params = Object.fromEntries(new URLSearchParams(rawBody).entries());
    const webhookUrl = buildWebhookUrl(request);
    const isValid = twilio.validateRequest(authToken, signature, webhookUrl, params);

    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const from = params.From;
    const body = params.Body;
    const messageSid = params.MessageSid;

    if (
      !from ||
      !body ||
      !messageSid ||
      from.length > 64 ||
      body.length > 4_000 ||
      messageSid.length > 100
    ) {
      return twimlResponse(EMPTY_TWIML, 400);
    }

    const phone = normalizeToE164Digits(from);

    if (!phone) {
      return twimlResponse(EMPTY_TWIML, 400);
    }

    const contact = await findContactByExactPhone(phone);

    if (contact.status === "ambiguous") {
      return twimlResponse(EMPTY_TWIML, 409);
    }

    if (contact.status === "found") {
      // Keep the metadata lookup for events created before deterministic IDs existed.
      const existingEvent = await prisma.activityEvent.findFirst({
        where: {
          contactId: contact.id,
          type: "sms_reply",
          metadata: { path: ["messageSid"], equals: messageSid },
        },
        select: { id: true },
      });

      if (existingEvent) {
        return twimlResponse(EMPTY_TWIML);
      }

      try {
        await prisma.activityEvent.create({
          data: {
            id: activityIdForMessage(messageSid),
            contactId: contact.id,
            type: "sms_reply",
            title: "SMS Reply Received",
            description: body,
            metadata: { messageSid, from },
          },
        });
      } catch (error) {
        if (isUniqueConstraintError(error)) {
          return twimlResponse(EMPTY_TWIML);
        }
        throw error;
      }
    }

    // Acknowledge the first valid inbound message.
    return twimlResponse(REPLY_TWIML);
  } catch (err) {
    if (err instanceof RequestBodyTooLargeError) {
      return twimlResponse(EMPTY_TWIML, 413);
    }
    if (err instanceof InvalidTextBodyError) {
      return twimlResponse(EMPTY_TWIML, 400);
    }
    console.error("[webhook/twilio] processing failed");
    return twimlResponse(EMPTY_TWIML, 500);
  }
}
