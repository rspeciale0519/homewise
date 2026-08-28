import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import {
  sendEmail,
  personalizeTemplate,
  escapeHtmlTokens,
  escapeHttpUrl,
  sanitizeEmailSubject,
} from "@/lib/email";
import { birthdayGreeting, pastClientAnniversary } from "@/lib/email/templates";
import { buildAgentBrandedEmailHtml } from "@/lib/email/agent-branded";
import { createUnsubscribeToken } from "@/lib/email/action-token";
import { canSendPreferenceEmail } from "@/lib/email/suppression";

const AGENT_SELECT = {
  firstName: true, lastName: true, email: true, phone: true,
  photoUrl: true, emailSignature: true, emailTagline: true, brandColor: true,
} as const;

export const dailyBirthdayCheck = inngest.createFunction(
  { id: "daily-birthday-check", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Daily at 9 AM
  async ({ step }) => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const birthdayIds = await step.run("find-birthday-contacts", async () => {
      const contacts = await prisma.contact.findMany({
        where: {
          birthday: { not: null },
          marketingEmailOptOutAt: null,
        },
        select: { id: true, birthday: true },
      });
      return contacts
        .filter((c) => c.birthday && c.birthday.getMonth() + 1 === month && c.birthday.getDate() === day)
        .map((c) => c.id);
    });

    const anniversaryIds = await step.run("find-anniversary-contacts", async () => {
      const contacts = await prisma.contact.findMany({
        where: {
          closeAnniversary: { not: null },
          marketingEmailOptOutAt: null,
        },
        select: { id: true, closeAnniversary: true },
      });
      return contacts
        .filter((c) => c.closeAnniversary && c.closeAnniversary.getMonth() + 1 === month && c.closeAnniversary.getDate() === day)
        .map((c) => c.id);
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
    let sent = 0;

    for (const contactId of birthdayIds) {
      await step.run(`birthday-${contactId}`, async () => {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, marketingEmailOptOutAt: null },
          include: { assignedAgent: { select: AGENT_SELECT } },
        });
        if (!contact) return;

        const template = birthdayGreeting();
        const agent = contact.assignedAgent;
        const agentName = agent ? `${agent.firstName} ${agent.lastName}` : "Your Homewise Agent";
        const unsubscribeToken = createUnsubscribeToken(
          { kind: "contact", id: contact.id },
          contact.email,
        );
        const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;

        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          agent_name: agentName,
          site_url: siteUrl,
          unsubscribe_url: unsubscribeUrl,
        };

        const subject = sanitizeEmailSubject(
          personalizeTemplate(template.subject, tokens),
        );
        const htmlTokens = escapeHtmlTokens(tokens);
        htmlTokens.site_url = escapeHttpUrl(siteUrl).replace(/\/$/, "");
        htmlTokens.unsubscribe_url = escapeHttpUrl(unsubscribeUrl);
        const wrappedTemplate = agent
          ? buildAgentBrandedEmailHtml(template.body, agent)
          : template.html;
        const html = personalizeTemplate(wrappedTemplate, htmlTokens);
        const fromName = agent ? `${agent.firstName} ${agent.lastName} via Homewise FL` : undefined;

        if (!await canSendPreferenceEmail({
          kind: "contact",
          id: contact.id,
          recipientEmail: contact.email,
        })) return;

        await sendEmail({
          to: contact.email,
          subject,
          html,
          from: fromName ? `${fromName} <noreply@homewisefl.com>` : undefined,
          replyTo: agent?.email ?? undefined,
          tags: [{ name: "type", value: "birthday" }],
        });
        sent++;
      });
    }

    for (const contactId of anniversaryIds) {
      await step.run(`anniversary-${contactId}`, async () => {
        const contact = await prisma.contact.findFirst({
          where: { id: contactId, marketingEmailOptOutAt: null },
          include: { assignedAgent: { select: AGENT_SELECT } },
        });
        if (!contact) return;

        const template = pastClientAnniversary();
        const agent = contact.assignedAgent;
        const unsubscribeToken = createUnsubscribeToken(
          { kind: "contact", id: contact.id },
          contact.email,
        );
        const unsubscribeUrl = `${siteUrl}/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}`;
        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          site_url: siteUrl,
          unsubscribe_url: unsubscribeUrl,
        };

        const subject = sanitizeEmailSubject(
          personalizeTemplate(template.subject, tokens),
        );
        const htmlTokens = escapeHtmlTokens(tokens);
        htmlTokens.site_url = escapeHttpUrl(siteUrl).replace(/\/$/, "");
        htmlTokens.unsubscribe_url = escapeHttpUrl(unsubscribeUrl);
        const wrappedTemplate = agent
          ? buildAgentBrandedEmailHtml(template.body, agent)
          : template.html;
        const html = personalizeTemplate(wrappedTemplate, htmlTokens);
        const fromName = agent ? `${agent.firstName} ${agent.lastName} via Homewise FL` : undefined;

        if (!await canSendPreferenceEmail({
          kind: "contact",
          id: contact.id,
          recipientEmail: contact.email,
        })) return;

        await sendEmail({
          to: contact.email,
          subject,
          html,
          from: fromName ? `${fromName} <noreply@homewisefl.com>` : undefined,
          replyTo: agent?.email ?? undefined,
          tags: [{ name: "type", value: "anniversary" }],
        });
        sent++;
      });
    }

    return { birthdays: birthdayIds.length, anniversaries: anniversaryIds.length, sent };
  },
);
