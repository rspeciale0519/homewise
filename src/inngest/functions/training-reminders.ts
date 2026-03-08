import { inngest } from "../client";
import { prisma } from "@/lib/prisma";
import { sendEmail, buildEmailHtml } from "@/lib/email";

interface OverdueEnrollment {
  id: string;
  userId: string;
  createdAt: Date;
  track: {
    id: string;
    name: string;
    reminderDays: number;
    reminderRepeat: number | null;
    items: { id: string; contentId: string; content: { title: string } }[];
  };
}

export const trainingReminders = inngest.createFunction(
  { id: "training-reminders", concurrency: { limit: 1 } },
  { cron: "0 9 * * *" },
  async ({ step }) => {
    const overdueEnrollments = await step.run(
      "fetch-overdue-enrollments",
      async () => {
        const now = new Date();
        const rows = await prisma.trainingEnrollment.findMany({
          where: {
            completedAt: null,
            track: {
              required: true,
              reminderDays: { not: null },
            },
          },
          include: {
            track: {
              include: {
                items: {
                  include: { content: { select: { title: true } } },
                  orderBy: { sortOrder: "asc" },
                },
              },
            },
          },
        });

        return rows.filter((row) => {
          const reminderDays = row.track.reminderDays;
          if (reminderDays === null) return false;
          const elapsed = Math.floor(
            (now.getTime() - new Date(row.createdAt).getTime()) / 86400000,
          );
          return elapsed >= reminderDays;
        }) as unknown as OverdueEnrollment[];
      },
    );

    let sent = 0;

    for (const enrollment of overdueEnrollments) {
      const now = new Date();
      const daysOverdue =
        Math.floor(
          (now.getTime() - new Date(enrollment.createdAt).getTime()) / 86400000,
        ) - enrollment.track.reminderDays;

      if (daysOverdue < 0) continue;

      const { reminderRepeat } = enrollment.track;
      if (reminderRepeat && reminderRepeat > 0) {
        if (daysOverdue % reminderRepeat !== 0) continue;
      } else {
        if (daysOverdue !== 0) continue;
      }

      await step.run(`send-reminder-${enrollment.id}`, async () => {
        const user = await prisma.userProfile.findUnique({
          where: { id: enrollment.userId },
          select: { email: true, firstName: true },
        });

        if (!user) return;

        const completedContentIds = await prisma.trainingProgress.findMany({
          where: {
            userId: enrollment.userId,
            completed: true,
            contentId: {
              in: enrollment.track.items.map((item) => item.contentId),
            },
          },
          select: { contentId: true },
        });

        const completedSet = new Set(
          completedContentIds.map((p) => p.contentId),
        );
        const incompleteItems = enrollment.track.items.filter(
          (item) => !completedSet.has(item.contentId),
        );

        if (incompleteItems.length === 0) return;

        const incompleteList = incompleteItems
          .map((item) => `<li>${item.content.title}</li>`)
          .join("");

        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL ?? "https://homewisefl.com";

        const body = `
          <h2>Training Reminder</h2>
          <p>Hi ${user.firstName},</p>
          <p>You have incomplete items in the required training track: <strong>${enrollment.track.name}</strong></p>
          <ul>${incompleteList}</ul>
          <p><a href="${appUrl}/dashboard/training" class="btn">Go to Training</a></p>
        `;

        await sendEmail({
          to: user.email,
          subject: `Training Reminder: ${enrollment.track.name}`,
          html: buildEmailHtml(body),
        });

        sent++;
      });
    }

    return { sent };
  },
);
