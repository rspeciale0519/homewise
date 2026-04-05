import { NextRequest, NextResponse } from "next/server";
import twilio from "twilio";
import { prisma } from "@/lib/prisma";
import { logActivityByEmail } from "@/lib/crm/log-activity";

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

    const formData = await request.formData();
    const params = Object.fromEntries(
      [...formData.entries()].map(([key, value]) => [key, String(value)])
    );
    const webhookUrl = buildWebhookUrl(request);
    const isValid = twilio.validateRequest(authToken, signature, webhookUrl, params);

    if (!isValid) {
      return new NextResponse("Invalid signature", { status: 401 });
    }

    const from = formData.get("From") as string | null;
    const body = formData.get("Body") as string | null;
    const messageSid = formData.get("MessageSid") as string | null;

    if (!from || !body) {
      return new NextResponse(
        '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        { headers: { "Content-Type": "text/xml" } },
      );
    }

    // Normalize phone number for lookup
    const phone = from.replace(/\D/g, "").slice(-10);

    const contact = await prisma.contact.findFirst({
      where: {
        phone: { contains: phone },
      },
      select: { id: true, email: true },
    });

    if (contact) {
      await logActivityByEmail(contact.email, "sms_reply", "SMS Reply Received", body, {
        messageSid,
        from,
      } as Record<string, string>);
    }

    // Respond with empty TwiML
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response><Message>Thank you for your message! An agent will get back to you shortly.</Message></Response>',
      { headers: { "Content-Type": "text/xml" } },
    );
  } catch (err) {
    console.error("[webhook/twilio] error:", err);
    return new NextResponse(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
      { headers: { "Content-Type": "text/xml" } },
    );
  }
}
