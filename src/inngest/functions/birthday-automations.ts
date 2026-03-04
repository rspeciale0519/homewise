import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, personalizeTemplate } from "@/lib/email";
import { birthdayGreeting, pastClientAnniversary } from "@/lib/email/templates";

export const dailyBirthdayCheck = inngest.createFunction(
  { id: "daily-birthday-check", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" }, // Daily at 9 AM
  async ({ step }) => {
    const today = new Date();
    const month = today.getMonth() + 1;
    const day = today.getDate();

    const birthdayContacts = await step.run("find-birthday-contacts", async () => {
      const contacts = await prisma.contact.findMany({
        where: { birthday: { not: null } },
        include: {
          assignedAgent: { select: { firstName: true, lastName: true } },
        },
      });

      return contacts.filter((c) => {
        if (!c.birthday) return false;
        return c.birthday.getMonth() + 1 === month && c.birthday.getDate() === day;
      });
    });

    const anniversaryContacts = await step.run("find-anniversary-contacts", async () => {
      const contacts = await prisma.contact.findMany({
        where: { closeAnniversary: { not: null } },
        include: {
          assignedAgent: { select: { firstName: true, lastName: true } },
        },
      });

      return contacts.filter((c) => {
        if (!c.closeAnniversary) return false;
        return c.closeAnniversary.getMonth() + 1 === month && c.closeAnniversary.getDate() === day;
      });
    });

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://homewisefl.com";
    let sent = 0;

    for (const contact of birthdayContacts) {
      await step.run(`birthday-${contact.id}`, async () => {
        const template = birthdayGreeting();
        const agentName = contact.assignedAgent
          ? `${contact.assignedAgent.firstName} ${contact.assignedAgent.lastName}`
          : "Your Homewise Agent";

        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          agent_name: agentName,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?id=${contact.id}`,
        };

        await sendEmail({
          to: contact.email,
          subject: personalizeTemplate(template.subject, tokens),
          html: personalizeTemplate(template.html, tokens),
          tags: [{ name: "type", value: "birthday" }],
        });
        sent++;
      });
    }

    for (const contact of anniversaryContacts) {
      await step.run(`anniversary-${contact.id}`, async () => {
        const template = pastClientAnniversary();
        const tokens: Record<string, string> = {
          first_name: contact.firstName,
          site_url: siteUrl,
          unsubscribe_url: `${siteUrl}/unsubscribe?id=${contact.id}`,
        };

        await sendEmail({
          to: contact.email,
          subject: personalizeTemplate(template.subject, tokens),
          html: personalizeTemplate(template.html, tokens),
          tags: [{ name: "type", value: "anniversary" }],
        });
        sent++;
      });
    }

    return { birthdays: birthdayContacts.length, anniversaries: anniversaryContacts.length, sent };
  },
);
