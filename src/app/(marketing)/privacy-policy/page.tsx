import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { privacySections } from "./privacy-sections";

export const metadata: Metadata = createMetadata({
  title: "Privacy Policy",
  description:
    "Privacy Policy for Home Wise Realty Group — learn how we collect, use, and protect your personal information on homewisefl.com.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return (
    <LegalPageLayout
      title="Privacy Policy"
      lastUpdated="March 1, 2026"
      sections={privacySections}
    />
  );
}
