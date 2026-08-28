import { prisma } from "@/lib/prisma";

export type EmailPreferenceTarget =
  | { kind: "property_alert"; id: string; recipientEmail: string }
  | { kind: "saved_search"; id: string; recipientEmail: string }
  | { kind: "contact"; id: string; recipientEmail: string }
  | { kind: "user"; id: string; recipientEmail: string };

export async function canSendPreferenceEmail(
  target: EmailPreferenceTarget,
): Promise<boolean> {
  switch (target.kind) {
    case "property_alert":
      return Boolean(await prisma.propertyAlert.findFirst({
        where: {
          id: target.id,
          email: target.recipientEmail,
          active: true,
          verificationRequired: false,
        },
        select: { id: true },
      }));
    case "saved_search":
      return Boolean(await prisma.savedSearch.findFirst({
        where: {
          id: target.id,
          alertEnabled: true,
          user: { email: target.recipientEmail },
        },
        select: { id: true },
      }));
    case "contact":
      return Boolean(await prisma.contact.findFirst({
        where: {
          id: target.id,
          email: target.recipientEmail,
          marketingEmailOptOutAt: null,
        },
        select: { id: true },
      }));
    case "user":
      return Boolean(await prisma.userProfile.findFirst({
        where: {
          id: target.id,
          email: target.recipientEmail,
          favoritePriceAlertsEnabled: true,
        },
        select: { id: true },
      }));
  }
}
