import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { sendEmail } from "@/lib/email";
import { openHouseRsvpSchema } from "@/schemas/open-house-rsvp.schema";
import { logApiError } from "@/lib/api-error";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import {
  clientIpRateRule,
  publicMutationRateLimiter,
} from "@/lib/public-rate-limit";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, 3_000);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = openHouseRsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const ipRule = clientIpRateRule(request, "open-house-rsvp", 60);
  const rateLimit = await publicMutationRateLimiter.consume([
    ...(ipRule ? [ipRule] : []),
    { key: `open-house-rsvp:email:${data.email}`, limit: 5 },
    { key: `open-house-rsvp:listing:${data.listingId}`, limit: 30 },
  ]);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: rateLimit.unavailable
          ? "The RSVP service is temporarily unavailable. Please try again later."
          : "Too many RSVP requests. Please try again later.",
      },
      {
        status: rateLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }
  const listing = await prisma.listing.findFirst({
    where: withIdx({ id: data.listingId }),
    select: {
      id: true,
      address: true,
      city: true,
      listingAgentMlsId: true,
    },
  });

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const openHouseKey = data.openHouseKey || null;
  const slotDate = data.slotDate || null;
  const recentRsvp = await prisma.openHouseRsvp.findFirst({
    where: {
      listingId: listing.id,
      email: data.email,
      openHouseKey,
      ...(!openHouseKey ? { slotDate } : {}),
      createdAt: { gte: new Date(Date.now() - 15 * 60_000) },
    },
    select: { id: true },
  });
  if (recentRsvp) {
    return NextResponse.json({ id: recentRsvp.id }, { status: 200 });
  }

  const notificationRecipient = await findNotificationRecipient(listing);
  if (notificationRecipient) {
    const notificationLimit = await publicMutationRateLimiter.consume([
      {
        key: `open-house-rsvp:recipient:${notificationRecipient.to.toLowerCase()}`,
        limit: 60,
      },
    ]);
    if (!notificationLimit.allowed) {
      return NextResponse.json(
        {
          error: notificationLimit.unavailable
            ? "The RSVP service is temporarily unavailable. Please try again later."
            : "Too many RSVP requests. Please try again later.",
        },
        {
          status: notificationLimit.unavailable ? 503 : 429,
          headers: {
            "Retry-After": String(notificationLimit.retryAfterSeconds),
          },
        },
      );
    }
  }

  const rsvp = await prisma.openHouseRsvp.create({
    data: {
      listingId: listing.id,
      openHouseKey,
      slotDate,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
    },
    select: { id: true },
  });

  if (notificationRecipient) {
    await notifyAgent(listing, data, notificationRecipient).catch((error) => {
      logApiError("open-house-rsvp/notification", error);
    });
  }

  return NextResponse.json({ id: rsvp.id }, { status: 201 });
}

interface NotificationRecipient {
  to: string;
  firstName: string | null;
}

async function findNotificationRecipient(
  listing: { listingAgentMlsId: string | null },
): Promise<NotificationRecipient | null> {
  const mlsAgentId = normalizeMlsAgentId(listing.listingAgentMlsId);
  const agent = mlsAgentId
    ? await prisma.agent.findFirst({
        where: { mlsAgentId, active: true, email: { not: null } },
        select: { email: true, firstName: true },
      })
    : null;

  const to = agent?.email ?? process.env.DIRECT_MAIL_ADMIN_ALERT_EMAIL;
  return to ? { to, firstName: agent?.firstName ?? null } : null;
}

async function notifyAgent(
  listing: { address: string; city: string },
  rsvp: { name: string; email: string; phone?: string; slotDate?: string },
  recipient: NotificationRecipient,
): Promise<void> {
  await sendEmail({
    to: recipient.to,
    subject: `Open house RSVP — ${listing.address}, ${listing.city}`,
    html: [
      `<p>${recipient.firstName ? `Hi ${recipient.firstName},` : "Hi,"}</p>`,
      `<p><strong>${escapeHtml(rsvp.name)}</strong> plans to attend the open house at <strong>${escapeHtml(listing.address)}, ${escapeHtml(listing.city)}</strong>${rsvp.slotDate ? ` on ${escapeHtml(rsvp.slotDate)}` : ""}.</p>`,
      `<p>Email: ${escapeHtml(rsvp.email)}${rsvp.phone ? `<br/>Phone: ${escapeHtml(rsvp.phone)}` : ""}</p>`,
    ].join("\n"),
    tags: [{ name: "type", value: "open-house-rsvp" }],
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
