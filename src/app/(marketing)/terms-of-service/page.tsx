import type { Metadata } from "next";
import { createMetadata } from "@/lib/metadata";
import { LegalPageLayout } from "@/components/legal/legal-page-layout";
import { tosSections } from "./tos-sections";

export const metadata: Metadata = createMetadata({
  title: "Terms of Service",
  description:
    "Terms of Service for Home Wise Realty Group — your use of homewisefl.com is subject to these terms and conditions.",
  path: "/terms-of-service",
});

export default function TermsOfServicePage() {
  return (
    <LegalPageLayout
      title="Terms of Service"
      lastUpdated="March 1, 2026"
      sections={tosSections}
    />
  );
}
