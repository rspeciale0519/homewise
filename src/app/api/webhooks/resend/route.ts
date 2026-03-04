import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface ResendWebhookPayload {
  type: string;
  data: {
    email_id?: string;
    to?: string[];
    subject?: string;
    tags?: { name: string; value: string }[];
    created_at?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as ResendWebhookPayload;
    const { type, data } = payload;

    const emailAddress = data.to?.[0] ?? "";
    const messageId = data.email_id ?? null;
    const tags = data.tags ?? [];
    const campaignId = tags.find((t) => t.name === "campaign_id")?.value ?? null;
    const variant = tags.find((t) => t.name === "variant")?.value ?? null;

    const contact = emailAddress
      ? await prisma.contact.findUnique({ where: { email: emailAddress }, select: { id: true } })
      : null;

    await prisma.emailEvent.create({
      data: {
        contactId: contact?.id ?? null,
        emailAddress,
        messageId,
        type,
        subject: data.subject ?? null,
        campaignId,
        variant,
        metadata: JSON.parse(JSON.stringify(data)),
      },
    });

    if (type === "email.opened" && contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { score: { increment: 2 } },
      });
    }

    if (type === "email.clicked" && contact) {
      await prisma.contact.update({
        where: { id: contact.id },
        data: { score: { increment: 5 } },
      });
    }

    if (variant && campaignId) {
      if (type === "email.opened") {
        await prisma.subjectLineVariant.updateMany({
          where: { campaignEmailId: campaignId, variant },
          data: { openCount: { increment: 1 } },
        });
      }
      if (type === "email.clicked") {
        await prisma.subjectLineVariant.updateMany({
          where: { campaignEmailId: campaignId, variant },
          data: { clickCount: { increment: 1 } },
        });
      }
    }

    // Fire behavioral automation rules for email events
    if (contact && (type === "email.opened" || type === "email.clicked")) {
      const rules = await prisma.automationRule.findMany({
        where: { triggerType: type, active: true },
      });

      for (const rule of rules) {
        console.log(`[automation] would fire rule "${rule.name}" for contact ${contact.id}`);
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/resend] error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
