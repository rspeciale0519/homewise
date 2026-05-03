import { sendEmail } from "@/lib/email";
import {
  mailClassLabel,
  productTypeLabel,
  workflowLabel,
  type MailClass,
  type ProductType,
  type Workflow,
} from "./constants";
import type { ReturnAddress } from "./schemas";

export type ArtworkLink = {
  id: string;
  name: string;
  fileName: string;
  url: string;
};

const FROM_EMAIL =
  process.env.HOMEWISE_DIRECT_MAIL_FROM_EMAIL ??
  "Homewise Direct Mail <direct-mail@email.homewisefl.com>";

const YLS_INBOX = process.env.YLS_ORDERS_INBOX_EMAIL ?? "orders@yellowlettershop.com";

const ADMIN_ALERT_EMAIL =
  process.env.DIRECT_MAIL_ADMIN_ALERT_EMAIL ?? "admin@homewisefl.com";

export interface OrderEmailInput {
  orderRef: string;
  submittedAt: Date;
  agent: { name: string; email: string; phone: string | null; brokerage: string };
  workflow: Workflow;
  subjectPropertyAddress: string | null;
  campaignName: string | null;
  productType: ProductType;
  productSize: string;
  mailClass: MailClass;
  dropDate: string;
  quantity: number;
  listRowCount: number;
  returnAddress: ReturnAddress;
  specialInstructions: string | null;
  signedUrls: {
    summary: string;
    list: string;
  };
  artworkLinks: ArtworkLink[];
}

export async function sendOrderToYls(
  input: OrderEmailInput,
): Promise<{ id: string | null; error: string | null }> {
  const subject = buildSubject(input);
  const html = buildOrderHtml(input);

  const result = await sendEmail({
    to: YLS_INBOX,
    subject,
    html,
    from: FROM_EMAIL,
    replyTo: input.agent.email,
    tags: [
      { name: "type", value: "direct_mail_order" },
      { name: "workflow", value: input.workflow },
      { name: "order_ref", value: input.orderRef },
    ],
  });

  return result;
}

function buildSubject(input: OrderEmailInput): string {
  const stamp = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(input.submittedAt)
    .replace(/[/]/g, "-");
  return `[HomeWise Direct Mail] ${workflowLabel(input.workflow)} — ${input.agent.name} — ${stamp}`;
}

function buildOrderHtml(input: OrderEmailInput): string {
  const subjectLine = input.subjectPropertyAddress
    ? `Subject property: ${escapeHtml(input.subjectPropertyAddress)}`
    : input.campaignName
      ? `Campaign: ${escapeHtml(input.campaignName)}`
      : "Custom direct mail order";
  const ra = input.returnAddress;
  const artworkItems = input.artworkLinks
    .map(
      (a) =>
        `<li><strong>${escapeHtml(a.name)}:</strong> <a href="${a.url}">${escapeHtml(a.fileName)}</a></li>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#334155;background:#f8fafc;padding:20px">
  <div style="max-width:680px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
    <div style="background:#2E276D;color:#fff;padding:18px 24px">
      <div style="font-size:11px;letter-spacing:1.5px;text-transform:uppercase;opacity:.8">HomeWise FL · Direct Mail Order</div>
      <div style="font-size:18px;font-weight:600;margin-top:4px">${escapeHtml(workflowLabel(input.workflow))}</div>
      <div style="font-size:13px;opacity:.85;margin-top:2px">${subjectLine}</div>
    </div>
    <div style="padding:20px 24px;font-size:14px;line-height:1.55">
      <p style="margin:0 0 14px"><strong>New direct-mail order from a HomeWise agent.</strong> Reply to this email to send proofs and invoice — the agent is on reply-to and CC.</p>

      <h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Agent</h3>
      <div>${escapeHtml(input.agent.name)} · ${escapeHtml(input.agent.brokerage)}</div>
      <div><a href="mailto:${escapeHtml(input.agent.email)}">${escapeHtml(input.agent.email)}</a>${input.agent.phone ? ` · ${escapeHtml(input.agent.phone)}` : ""}</div>

      <h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Mail spec</h3>
      <ul style="margin:0;padding-left:18px">
        <li>Product: <strong>${escapeHtml(productTypeLabel(input.productType))} · ${escapeHtml(input.productSize)}</strong></li>
        <li>Mail class: ${escapeHtml(mailClassLabel(input.mailClass))}</li>
        <li>Drop date: <strong>${escapeHtml(input.dropDate)}</strong></li>
        <li>Quantity: ${input.quantity.toLocaleString()} pieces</li>
        <li>List size: ${input.listRowCount.toLocaleString()} recipients</li>
      </ul>

      <h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Return address</h3>
      <div>${escapeHtml(ra.name)}</div>
      <div>${escapeHtml(ra.address1)}${ra.address2 ? `, ${escapeHtml(ra.address2)}` : ""}</div>
      <div>${escapeHtml(ra.city)}, ${escapeHtml(ra.state)} ${escapeHtml(ra.zip)}</div>

      <h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Order summary &amp; mailing list (links expire in 30 days)</h3>
      <ul style="margin:0;padding-left:18px">
        <li><strong>Order summary PDF:</strong> <a href="${input.signedUrls.summary}">Download</a></li>
        <li><strong>Mailing list (CSV):</strong> <a href="${input.signedUrls.list}">Download</a></li>
      </ul>

      <h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Artwork files (${input.artworkLinks.length})</h3>
      <ul style="margin:0;padding-left:18px">
        ${artworkItems}
      </ul>

      ${
        input.specialInstructions
          ? `<h3 style="margin:18px 0 6px;font-size:13px;color:#DB2526;text-transform:uppercase;letter-spacing:1px">Special instructions</h3>
             <div style="background:#f8fafc;border-left:3px solid #DB2526;padding:8px 12px;border-radius:2px;font-style:italic">${escapeHtml(input.specialInstructions)}</div>`
          : ""
      }

      <p style="margin:24px 0 0;font-size:12px;color:#64748b">Order ref: <code>${escapeHtml(input.orderRef)}</code> · Submitted ${input.submittedAt.toISOString()}</p>
    </div>
  </div>
</body></html>`;
}

export async function sendDispatchFailureAlert(input: {
  orderRef: string;
  agentName: string;
  agentEmail: string;
  attempts: number;
  lastError: string | null;
}): Promise<void> {
  const subject = `[HomeWise] Direct mail dispatch failed — ${input.orderRef}`;
  const html = `
    <p>An order from <strong>${escapeHtml(input.agentName)}</strong> (${escapeHtml(input.agentEmail)})
    failed to dispatch to YLS after ${input.attempts} attempt${input.attempts === 1 ? "" : "s"}.</p>
    <p><strong>Order ref:</strong> ${escapeHtml(input.orderRef)}</p>
    <p><strong>Last error:</strong> ${escapeHtml(input.lastError ?? "unknown")}</p>
    <p>Recover from <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/admin/direct-mail">/admin/direct-mail</a>.</p>
  `;
  await sendEmail({
    to: ADMIN_ALERT_EMAIL,
    subject,
    html,
    from: FROM_EMAIL,
    tags: [
      { name: "type", value: "direct_mail_dispatch_failure" },
      { name: "order_ref", value: input.orderRef },
    ],
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
