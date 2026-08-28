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
import {
  RECOMMENDED_LISTINGS_TOKEN,
  recommendedListingsHtmlForContact,
} from "@/lib/recommendation-email";
import { sendSms } from "@/lib/sms";
import { pickVariant } from "@/lib/email/ab-testing";
import { buildAgentBrandedEmailHtml, getAgentBrandTokens } from "@/lib/email/agent-branded";
import { sanitizeRichHtml } from "@/lib/sanitize-rich-html";
import { createUnsubscribeToken } from "@/lib/email/action-token";
import { canSendPreferenceEmail } from "@/lib/email/suppression";

export const processDripCampaigns = inngest.createFunction(
  { id: "process-drip-campaigns", concurrency: { limit: 1 } },
  { cron: "*/10 * * * *" }, // Every 10 minutes
  async ({ step }) => {
    const enrollmentIds = await step.run("fetch-due-enrollments", async () => {
      const rows = await prisma.campaignEnrollment.findMany({
        where: {
          status: "active",
          nextSendAt: { lte: new Date() },
        },
        select: { id: true },
        take: 50,
      });
      return rows.map((r) => r.id);
    });

    let sent = 0;

    for (const enrollmentId of enrollmentIds) {
      await step.run(`send-${enrollmentId}`, async () => {
        const enrollment = await prisma.campaignEnrollment.findUnique({
          where: { id: enrollmentId },
          include: {
            contact: {
              include: {
                assignedAgent: {
                  select: {
                    firstName: true, lastName: true, email: true, phone: true,
                    photoUrl: true, emailSignature: true, emailTagline: true, brandColor: true,
                  },
                },
              },
            },
            campaign: {
              include: { emails: { orderBy: { sortOrder: "asc" } } },
            },
          },
        });

        if (!enrollment) return;

        const email = enrollment.campaign.emails[enrollment.currentStep];
        if (!email) {
          await prisma.campaignEnrollment.update({
            where: { id: enrollmentId },
            data: { status: "completed", completedAt: new Date() },
          });
          return;
        }

        const contact = enrollment.contact;
        const agent = contact.assignedAgent;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
        const emailAllowed = contact.marketingEmailOptOutAt === null;
        const unsubscribeUrl = emailAllowed
          ? `${siteUrl}/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(
              { kind: "contact", id: contact.id },
              contact.email,
            ))}`
          : "";
        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          site_url: siteUrl,
          unsubscribe_url: unsubscribeUrl,
          agent_name: agent ? `${agent.firstName} ${agent.lastName}` : "Your Homewise Agent",
          area_of_interest: "",
          market_conditions: "active",
          avg_dom: "30",
          property_address: "",
          ...(agent ? getAgentBrandTokens(agent, siteUrl) : {}),
        };

        if (emailAllowed && email.body.includes(RECOMMENDED_LISTINGS_TOKEN)) {
          tokens[RECOMMENDED_LISTINGS_TOKEN] = await recommendedListingsHtmlForContact(
            contact,
            siteUrl,
          ).catch((error) => {
            console.error("[drip-campaign] recommendations failed:", error);
            return "";
          });
        }

        let delivered = false;
        if (email.channel === "sms" && email.smsBody && contact.phone) {
          const smsText = personalizeTemplate(email.smsBody, tokens);
          await sendSms({ to: contact.phone, body: smsText });
          delivered = true;
        } else if (emailAllowed) {
          const variant = await pickVariant(email.id);
          const subject = sanitizeEmailSubject(
            personalizeTemplate(variant?.subject ?? email.subject, tokens),
          );
          const htmlTokens = escapeHtmlTokens(tokens);
          htmlTokens.site_url = escapeHttpUrl(siteUrl).replace(/\/$/, "");
          htmlTokens.unsubscribe_url = escapeHttpUrl(unsubscribeUrl);

          const agentPhotoUrl = tokens.agent_photo_url;
          if (agentPhotoUrl) {
            htmlTokens.agent_photo_url = escapeHttpUrl(agentPhotoUrl);
          }

          const recommendedListingsHtml = tokens[RECOMMENDED_LISTINGS_TOKEN];
          if (recommendedListingsHtml !== undefined) {
            htmlTokens[RECOMMENDED_LISTINGS_TOKEN] = recommendedListingsHtml;
          }

          const body = sanitizeRichHtml(
            personalizeTemplate(email.body, htmlTokens),
          );

          const wrappedHtml = agent
            ? buildAgentBrandedEmailHtml(body, agent)
            : buildEmailHtml(body);
          const html = personalizeTemplate(wrappedHtml, {
            unsubscribe_url: htmlTokens.unsubscribe_url,
          });

          const fromName = agent ? `${agent.firstName} ${agent.lastName} via Homewise FL` : undefined;
          const fromAddr = fromName ? `${fromName} <noreply@homewisefl.com>` : undefined;

          if (await canSendPreferenceEmail({
            kind: "contact",
            id: contact.id,
            recipientEmail: contact.email,
          })) {
            await sendEmail({
              to: contact.email,
              subject,
              html,
              from: fromAddr,
              replyTo: agent?.email ?? undefined,
              tags: [
                { name: "campaign_id", value: email.id },
                ...(variant ? [{ name: "variant", value: variant.variant }] : []),
                ...(agent ? [{ name: "agent_id", value: "branded" }] : []),
              ],
            });
            delivered = true;
          }
        }

        const nextStep = enrollment.currentStep + 1;
        const nextEmail = enrollment.campaign.emails[nextStep];

        if (nextEmail) {
          const delayMs = (nextEmail.delayDays * 86400000) + (nextEmail.delayHours * 3600000);
          await prisma.campaignEnrollment.update({
            where: { id: enrollmentId },
            data: { currentStep: nextStep, nextSendAt: new Date(Date.now() + delayMs) },
          });
        } else {
          await prisma.campaignEnrollment.update({
            where: { id: enrollmentId },
            data: { status: "completed", completedAt: new Date(), nextSendAt: null },
          });
        }

        if (delivered) sent++;
      });
    }

    return { processed: enrollmentIds.length, sent };
  },
);

export const autoEnrollCampaign = inngest.createFunction(
  { id: "auto-enroll-campaign" },
  { event: "crm/contact.created" },
  async ({ event, step }) => {
    const { contactId, source, type, stage } = event.data as {
      contactId: string;
      source: string;
      type: string;
      stage: string;
    };

    await step.run("find-matching-campaigns", async () => {
      const contact = await prisma.contact.findFirst({
        where: { id: contactId, marketingEmailOptOutAt: null },
        select: { id: true },
      });
      if (!contact) return;

      const campaigns = await prisma.campaign.findMany({
        where: {
          status: "active",
          type: "drip",
          OR: [
            { triggerSource: source },
            { triggerType: type },
            { triggerStage: stage },
          ],
        },
        include: { emails: { orderBy: { sortOrder: "asc" }, take: 1 } },
      });

      for (const campaign of campaigns) {
        const firstEmail = campaign.emails[0];
        const delayMs = firstEmail
          ? (firstEmail.delayDays * 86400000) + (firstEmail.delayHours * 3600000)
          : 0;

        await prisma.campaignEnrollment.upsert({
          where: { campaignId_contactId: { campaignId: campaign.id, contactId } },
          create: { campaignId: campaign.id, contactId, nextSendAt: new Date(Date.now() + delayMs) },
          update: {},
        });
      }
    });
  },
);
