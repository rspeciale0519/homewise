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
  title: "Confirm Property Alerts | Homewise FL",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

interface ConfirmationPageProps {
  searchParams: Promise<{ token?: string | string[] }>;
}

export default async function PropertyAlertConfirmationPage({
  searchParams,
}: ConfirmationPageProps) {
  const value = (await searchParams).token;
  const token = typeof value === "string" ? value : "";
  let valid = false;

  if (token && token.length <= 2_048) {
    try {
      verifyEmailActionToken(token, "property_alert_confirmation");
      valid = true;
    } catch (error) {
      if (!(error instanceof EmailActionTokenError)) {
        console.error("[property-alert-confirm-page] token check failed", {
          name: error instanceof Error ? error.name : "UnknownError",
        });
      }
    }
  }

  if (value !== undefined && !valid) {
    redirect("/property-updates/confirm");
  }

  return (
    <main className="flex min-h-[65vh] items-center justify-center bg-cream-50 px-4 py-16">
      {valid ? (
        <EmailActionConfirmation
          token={token}
          endpoint="/api/property-alerts/confirm"
          title="Confirm Property Alerts"
          description="Select the button to confirm your email and start your property alerts."
          buttonLabel="Confirm Alerts"
          successTitle="Alerts Confirmed"
          successMessage="Your property alerts are active. We will email you when matching homes become available."
        />
      ) : (
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CircleAlert className="mx-auto h-12 w-12 text-crimson-600" aria-hidden="true" />
            <h1 className="mt-4 font-serif text-3xl font-semibold text-navy-800">Link Not Available</h1>
          </CardHeader>
          <CardBody>
            <p className="text-center text-slate-600">
              This confirmation link is invalid or expired. Request a new link from the property updates page.
            </p>
          </CardBody>
        </Card>
      )}
    </main>
  );
}
