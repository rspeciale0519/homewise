import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

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
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[webhook/resend] RESEND_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const svixId = request.headers.get("svix-id") ?? "";
  const svixTimestamp = request.headers.get("svix-timestamp") ?? "";
  const svixSignature = request.headers.get("svix-signature") ?? "";

  const wh = new Webhook(webhookSecret);
  let payload: ResendWebhookPayload;
  try {
    payload = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as ResendWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
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

    if (contact && (type === "email.opened" || type === "email.clicked")) {
      const rules = await prisma.automationRule.findMany({
        where: { triggerType: type, active: true },
      });

      for (const rule of rules) {
        await inngest.send({
          name: "crm/behavioral.trigger",
          data: { contactId: contact.id, ruleId: rule.id, triggerType: type },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[webhook/resend] error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
