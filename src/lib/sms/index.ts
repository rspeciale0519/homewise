import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
);

const FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER ?? "";

interface SendSmsInput {
  to: string;
  body: string;
  from?: string;
}

interface SendSmsResult {
  sid: string | null;
  error: string | null;
}

export async function sendSms({ to, body, from }: SendSmsInput): Promise<SendSmsResult> {
  try {
    const message = await client.messages.create({
      body,
      from: from ?? FROM_NUMBER,
      to,
    });
    return { sid: message.sid, error: null };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown SMS error";
    console.error("[sms] send failed:", errorMessage);
    return { sid: null, error: errorMessage };
  }
}
