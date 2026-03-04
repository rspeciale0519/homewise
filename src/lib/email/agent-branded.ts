/**
 * Agent-Branded Email Template (I3)
 *
 * Wraps email body in a template that shows the assigned agent's identity
 * (name, photo, signature) while the brokerage retains lead ownership.
 */

interface AgentBrand {
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  photoUrl: string | null;
  emailSignature: string | null;
  emailTagline: string | null;
  brandColor: string | null;
}

export function buildAgentBrandedEmailHtml(
  body: string,
  agent: AgentBrand,
  preheader?: string,
): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
  const color = agent.brandColor ?? "#1e293b";
  const fullName = `${agent.firstName} ${agent.lastName}`;
  const tagline = agent.emailTagline ?? "Your Homewise FL Agent";

  const photoBlock = agent.photoUrl
    ? `<img src="${agent.photoUrl}" alt="${fullName}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid ${color}" />`
    : `<div style="width:64px;height:64px;border-radius:50%;background:${color};color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:700">${agent.firstName[0]}${agent.lastName[0]}</div>`;

  const contactLinks: string[] = [];
  if (agent.email) contactLinks.push(`<a href="mailto:${agent.email}" style="color:${color};text-decoration:none">${agent.email}</a>`);
  if (agent.phone) contactLinks.push(`<a href="tel:${agent.phone}" style="color:${color};text-decoration:none">${agent.phone}</a>`);

  const signature = agent.emailSignature
    ? `<p style="margin:12px 0 0;font-style:italic;color:#64748b;font-size:13px">${agent.emailSignature}</p>`
    : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden">${preheader}</span>` : ""}
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .agent-header { padding: 24px; border-bottom: 1px solid #e2e8f0; }
    .body { padding: 24px; color: #334155; font-size: 15px; line-height: 1.6; }
    .agent-footer { padding: 20px 24px; background: #f8fafc; border-top: 1px solid #e2e8f0; }
    .brokerage-footer { padding: 12px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
    a { color: #2563eb; }
    .btn { display: inline-block; padding: 12px 24px; background: ${color}; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <!-- Agent Header -->
    <div class="agent-header">
      <table cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
          <td width="72" valign="top">
            ${photoBlock}
          </td>
          <td style="padding-left:16px" valign="middle">
            <p style="margin:0;font-size:18px;font-weight:700;color:${color}">${fullName}</p>
            <p style="margin:2px 0 0;font-size:13px;color:#64748b">${tagline}</p>
          </td>
          <td width="100" valign="middle" align="right">
            <img src="${siteUrl}/logo.png" alt="Homewise FL" style="height:28px;opacity:0.6" />
          </td>
        </tr>
      </table>
    </div>

    <!-- Email Body -->
    <div class="body">
      ${body}
    </div>

    <!-- Agent Signature Footer -->
    <div class="agent-footer">
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td valign="top" style="padding-right:12px">
            ${agent.photoUrl ? `<img src="${agent.photoUrl}" alt="" style="width:40px;height:40px;border-radius:50%;object-fit:cover" />` : ""}
          </td>
          <td valign="top">
            <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b">${fullName}</p>
            <p style="margin:2px 0 0;font-size:12px;color:#64748b">${tagline}</p>
            ${contactLinks.length > 0 ? `<p style="margin:4px 0 0;font-size:12px">${contactLinks.join(" | ")}</p>` : ""}
            ${signature}
          </td>
        </tr>
      </table>
    </div>

    <!-- Brokerage Footer -->
    <div class="brokerage-footer">
      <p style="margin:0">Sent by Homewise FL Real Estate</p>
      <p style="margin:4px 0 0"><a href="{{unsubscribe_url}}" style="color:#94a3b8">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Get personalization tokens for an agent-branded email.
 * Merges agent-specific tokens with the standard set.
 */
export function getAgentBrandTokens(
  agent: AgentBrand,
  siteUrl: string,
): Record<string, string> {
  return {
    agent_name: `${agent.firstName} ${agent.lastName}`,
    agent_first_name: agent.firstName,
    agent_last_name: agent.lastName,
    agent_email: agent.email ?? "",
    agent_phone: agent.phone ?? "",
    agent_photo_url: agent.photoUrl ?? "",
    site_url: siteUrl,
  };
}
