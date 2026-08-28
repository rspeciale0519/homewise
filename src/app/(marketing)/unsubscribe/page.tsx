import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CircleAlert } from "lucide-react";
import { EmailActionConfirmation } from "@/components/email/email-action-confirmation";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  EmailActionTokenError,
  verifyEmailActionToken,
} from "@/lib/email/action-token";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Unsubscribe | Homewise FL",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

interface UnsubscribePageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function UnsubscribePage({ searchParams }: UnsubscribePageProps) {
  const value = (await searchParams).token;
  const token = typeof value === "string" ? value : "";
  let valid = false;

  if (token && token.length <= 2_048) {
    try {
      verifyEmailActionToken(token, "unsubscribe");
      valid = true;
    } catch (error) {
      if (!(error instanceof EmailActionTokenError)) {
        console.error("[unsubscribe-page] token check failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  if (value !== undefined && !valid) {
    redirect("/unsubscribe");
  }

  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-cream-50 px-4 py-16">
      {valid ? (
        <EmailActionConfirmation
          token={token}
          endpoint="/api/email-preferences/unsubscribe"
          title="Stop These Emails?"
          description="Select the button to stop this type of Homewise email."
          buttonLabel="Unsubscribe"
          successTitle="You Are Unsubscribed"
          successMessage="You will not receive this type of Homewise email again."
        />
      ) : (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CircleAlert className="mx-auto h-12 w-12 text-crimson-600" aria-hidden="true" />
            <h1 className="mt-4 font-serif text-3xl font-semibold text-navy-800">Link Not Available</h1>
          </CardHeader>
          <CardBody>
            <p className="text-center text-slate-600">
              This unsubscribe link is invalid. Use the link from your latest Homewise email.
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
