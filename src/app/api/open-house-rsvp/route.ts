import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withIdx } from "@/lib/mls-visibility";
import { normalizeMlsAgentId } from "@/lib/mls-agent-id";
import { sendEmail } from "@/lib/email";
import { openHouseRsvpSchema } from "@/schemas/open-house-rsvp.schema";

export async function POST(request: NextRequest) {
  const body: unknown = await request.json().catch(() => null);
  const parsed = openHouseRsvpSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const data = parsed.data;
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

  const rsvp = await prisma.openHouseRsvp.create({
    data: {
      listingId: listing.id,
      openHouseKey: data.openHouseKey || null,
      slotDate: data.slotDate || null,
      name: data.name,
      email: data.email,
      phone: data.phone || null,
    },
    select: { id: true },
  });

  await notifyAgent(listing, data).catch((error) => {
    console.error("[open-house-rsvp] Notification failed:", error);
  });

  return NextResponse.json({ id: rsvp.id }, { status: 201 });
}

async function notifyAgent(
  listing: { address: string; city: string; listingAgentMlsId: string | null },
  rsvp: { name: string; email: string; phone?: string; slotDate?: string },
): Promise<void> {
  const mlsAgentId = normalizeMlsAgentId(listing.listingAgentMlsId);
  const agent = mlsAgentId
    ? await prisma.agent.findFirst({
        where: { mlsAgentId, active: true, email: { not: null } },
        select: { email: true, firstName: true },
      })
    : null;

  const to = agent?.email ?? process.env.DIRECT_MAIL_ADMIN_ALERT_EMAIL;
  if (!to) return;

  await sendEmail({
    to,
    subject: `Open house RSVP — ${listing.address}, ${listing.city}`,
    html: [
      `<p>${agent ? `Hi ${agent.firstName},` : "Hi,"}</p>`,
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
