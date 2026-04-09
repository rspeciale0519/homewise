import { Resend } from "resend";

let _resend: Resend | null = null;

function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "Homewise FL <noreply@homewisefl.com>";

interface EmailAttachment {
  filename: string;
  content: Buffer;
}

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
  tags?: { name: string; value: string }[];
  attachments?: EmailAttachment[];
}

interface SendEmailResult {
  id: string | null;
  error: string | null;
}

export async function sendEmail({
  to,
  subject,
  html,
  from,
  replyTo,
  tags,
  attachments,
}: SendEmailInput): Promise<SendEmailResult> {
  const { data, error } = await getResend().emails.send({
    from: from ?? FROM_EMAIL,
    to,
    subject,
    html,
    replyTo,
    tags,
    attachments: attachments?.map((a) => ({
      filename: a.filename,
      content: a.content,
    })),
  });

  if (error) {
    console.error("[email] send failed:", error);
    return { id: null, error: error.message };
  }

  return { id: data?.id ?? null, error: null };
}

export function personalizeTemplate(
  template: string,
  tokens: Record<string, string>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(tokens)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

export function buildEmailHtml(body: string, preheader?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>` : ""}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #1e293b; padding: 24px; text-align: center; }
    .header img { height: 32px; }
    .header h1 { color: #ffffff; font-size: 20px; margin: 8px 0 0; }
    .body { padding: 24px; color: #334155; font-size: 15px; line-height: 1.6; }
    .footer { padding: 16px 24px; background: #f8fafc; text-align: center; font-size: 12px; color: #94a3b8; }
    a { color: #2563eb; }
    .btn { display: inline-block; padding: 12px 24px; background: #1e293b; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Homewise FL</h1>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>Homewise FL Real Estate</p>
      <p><a href="{{unsubscribe_url}}">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}
