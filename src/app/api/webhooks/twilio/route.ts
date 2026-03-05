import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logActivityByEmail } from "@/lib/crm/log-activity";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
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
