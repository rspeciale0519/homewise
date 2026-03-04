import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate, buildEmailHtml } from "@/lib/email";
import { sendSms } from "@/lib/sms";
import { pickVariant } from "@/lib/email/ab-testing";

export const processDripCampaigns = inngest.createFunction(
  { id: "process-drip-campaigns", concurrency: { limit: 1 } },
  { cron: "*/10 * * * *" }, // Every 10 minutes
  async ({ step }) => {
    const enrollments = await step.run("fetch-due-enrollments", async () => {
      return prisma.campaignEnrollment.findMany({
        where: {
          status: "active",
          nextSendAt: { lte: new Date() },
        },
        include: {
          contact: true,
          campaign: {
            include: { emails: { orderBy: { sortOrder: "asc" } } },
          },
        },
        take: 50,
      });
    });

    let sent = 0;

    for (const enrollment of enrollments) {
      await step.run(`send-${enrollment.id}`, async () => {
        const email = enrollment.campaign.emails[enrollment.currentStep];
        if (!email) {
          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "completed", completedAt: new Date() },
          });
          return;
        }

        const contact = enrollment.contact;
        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email,
          site_url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com",
          unsubscribe_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com"}/unsubscribe?id=${contact.id}`,
          agent_name: "Your Homewise Agent",
          area_of_interest: "",
          market_conditions: "active",
          avg_dom: "30",
          property_address: "",
        };

        if (email.channel === "sms" && email.smsBody && contact.phone) {
          const smsText = personalizeTemplate(email.smsBody, tokens);
          await sendSms({ to: contact.phone, body: smsText });
        } else {
          const variant = await pickVariant(email.id);
          const subject = personalizeTemplate(variant?.subject ?? email.subject, tokens);
          const body = personalizeTemplate(email.body, tokens);

          await sendEmail({
            to: contact.email,
            subject,
            html: buildEmailHtml(body),
            tags: [
              { name: "campaign_id", value: email.id },
              ...(variant ? [{ name: "variant", value: variant.variant }] : []),
            ],
          });
        }

        const nextStep = enrollment.currentStep + 1;
        const nextEmail = enrollment.campaign.emails[nextStep];

        if (nextEmail) {
          const delayMs = (nextEmail.delayDays * 86400000) + (nextEmail.delayHours * 3600000);
          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { currentStep: nextStep, nextSendAt: new Date(Date.now() + delayMs) },
          });
        } else {
          await prisma.campaignEnrollment.update({
            where: { id: enrollment.id },
            data: { status: "completed", completedAt: new Date(), nextSendAt: null },
          });
        }

        sent++;
      });
    }

    return { processed: enrollments.length, sent };
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
