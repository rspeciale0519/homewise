import { NextRequest, NextResponse } from "next/server";
import DOMPurify from "isomorphic-dompurify";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate, buildEmailHtml } from "@/lib/email";

export async function GET() {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const broadcasts = await prisma.broadcast.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(broadcasts);
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  try {
    const body = (await request.json()) as {
      name: string;
      subject: string;
      body: string;
      audienceTag?: string;
      audienceIds?: string[];
      send?: boolean;
    };

    if (!body.name || !body.subject || !body.body) {
      return NextResponse.json({ error: "Name, subject, and body are required" }, { status: 400 });
    }

    const sanitizedBody = DOMPurify.sanitize(body.body);

    // Resolve audience
    let recipientIds = Array.from(new Set(body.audienceIds ?? []));
    if (body.audienceTag) {
      const tagged = await prisma.contactTag.findMany({
        where: { tag: { name: body.audienceTag } },
        select: { contactId: true },
      });
      recipientIds = [...new Set([...recipientIds, ...tagged.map((t) => t.contactId)])];
    } else if (body.send && recipientIds.length === 0) {
      const contacts = await prisma.contact.findMany({
        select: { id: true },
      });
      recipientIds = contacts.map((contact) => contact.id);
    }

    if (body.send && recipientIds.length === 0) {
      return NextResponse.json({ error: "No recipients available for this broadcast" }, { status: 400 });
    }

    let broadcast = await prisma.broadcast.create({
      data: {
        name: body.name,
        subject: body.subject,
        body: sanitizedBody,
        audienceTag: body.audienceTag ?? null,
        audienceIds: recipientIds,
        status: body.send ? "sending" : "draft",
      },
    });

    if (body.send && recipientIds.length > 0) {
      const contacts = await prisma.contact.findMany({
        where: { id: { in: recipientIds } },
        select: { id: true, email: true, firstName: true, lastName: true },
      });

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
      let sentCount = 0;

      for (const contact of contacts) {
        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          last_name: contact.lastName,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?id=${contact.id}`,
        };

        const result = await sendEmail({
          to: contact.email,
          subject: personalizeTemplate(body.subject, tokens),
          html: buildEmailHtml(personalizeTemplate(sanitizedBody, tokens)),
          tags: [
            { name: "type", value: "broadcast" },
            { name: "broadcast_id", value: broadcast.id },
          ],
        });

        if (!result.error) sentCount++;
      }

      broadcast = await prisma.broadcast.update({
        where: { id: broadcast.id },
        data: { status: "sent", sentAt: new Date(), sentCount },
      });
    }

    return NextResponse.json(broadcast, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create broadcast" }, { status: 500 });
  }
}
