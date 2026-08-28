import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  personalizeTemplate,
  buildEmailHtml,
  escapeHtmlTokens,
  escapeHttpUrl,
  sanitizeEmailSubject,
} from "@/lib/email";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createUnsubscribeToken } from "@/lib/email/action-token";
import { canSendPreferenceEmail } from "@/lib/email/suppression";

interface ActionData {
  emailSubject?: string;
  emailBody?: string;
  campaignId?: string;
  tagName?: string;
}

export const processBehavioralTrigger = inngest.createFunction(
  { id: "process-behavioral-trigger" },
  { event: "automation/trigger" },
  async ({ event, step }) => {
    const { triggerType, contactId, metadata } = event.data as {
      triggerType: string;
      contactId: string;
      metadata?: Record<string, unknown>;
    };

    const rules = await step.run("find-matching-rules", async () => {
      return prisma.automationRule.findMany({
        where: { triggerType, active: true },
      });
    });

    const contact = await step.run("fetch-contact", async () => {
      return prisma.contact.findUnique({ where: { id: contactId } });
    });

    if (!contact) return { matched: 0, actionsRun: 0 };

    let actionsRun = 0;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";

    for (const rule of rules) {
      const conditions = rule.conditions as Record<string, unknown>;

      // Check conditions match
      if (conditions.source && conditions.source !== contact.source) continue;
      if (conditions.type && conditions.type !== contact.type) continue;
      if (conditions.stage && conditions.stage !== contact.stage) continue;

      await step.run(`action-${rule.id}`, async () => {
        const actionData = rule.actionData as ActionData;

        switch (rule.actionType) {
          case "send_email": {
            if (
              contact.marketingEmailOptOutAt
              || !actionData.emailSubject
              || !actionData.emailBody
            ) break;
            const unsubscribeToken = createUnsubscribeToken(
              { kind: "contact", id: contact.id },
              contact.email,
            );
            const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
            const tokens: Record<string, string> = {
              first_name: contact.firstName,
              last_name: contact.lastName,
              site_url: siteUrl,
              unsubscribe_url: unsubscribeUrl,
            };

            if (metadata) {
              for (const [k, v] of Object.entries(metadata)) {
                tokens[k] = String(v);
              }
            }

            const subject = sanitizeEmailSubject(
              personalizeTemplate(actionData.emailSubject, tokens),
            );
            const htmlTokens = escapeHtmlTokens(tokens);
            htmlTokens.site_url = escapeHttpUrl(siteUrl).replace(/\/$/, "");
            htmlTokens.unsubscribe_url = escapeHttpUrl(unsubscribeUrl);
            const body = sanitizeRichHtml(
              personalizeTemplate(actionData.emailBody, htmlTokens),
            );
            const html = personalizeTemplate(buildEmailHtml(body), {
              unsubscribe_url: htmlTokens.unsubscribe_url,
            });

            if (!await canSendPreferenceEmail({
              kind: "contact",
              id: contact.id,
              recipientEmail: contact.email,
            })) break;

            await sendEmail({
              to: contact.email,
              subject,
              html,
              tags: [{ name: "type", value: "automation" }, { name: "rule_id", value: rule.id }],
            });
            break;
          }

          case "enroll_campaign": {
            if (contact.marketingEmailOptOutAt || !actionData.campaignId) break;
            await prisma.campaignEnrollment.upsert({
              where: {
                campaignId_contactId: { campaignId: actionData.campaignId, contactId: contact.id },
              },
              create: {
                campaignId: actionData.campaignId,
                contactId: contact.id,
                nextSendAt: new Date(),
              },
              update: {},
            });
            break;
          }

          case "add_tag": {
            if (!actionData.tagName) break;
            const tag = await prisma.tag.upsert({
              where: { name: actionData.tagName },
              create: { name: actionData.tagName },
              update: {},
            });
            await prisma.contactTag.upsert({
              where: { contactId_tagId: { contactId: contact.id, tagId: tag.id } },
              create: { contactId: contact.id, tagId: tag.id },
              update: {},
            });
            break;
          }

          case "update_score": {
            const points = typeof actionData === "object" && "points" in actionData
              ? Number(actionData.points)
              : 5;
            await prisma.contact.update({
              where: { id: contact.id },
              data: { score: { increment: points } },
            });
            break;
          }
        }

        actionsRun++;
      });
    }

    return { matched: rules.length, actionsRun };
  },
);
