import React from "react";
import type { PrivacySection } from "./privacy-sections-a";

const privacyEmail = (
  <a href="mailto:privacy@homewisefl.com" className="text-crimson-600 hover:text-crimson-700 underline">
    privacy@homewisefl.com
  </a>
);

export const privacySectionsB: PrivacySection[] = [
  {
    id: "california-residents",
    title: "8. California Residents (CCPA)",
    content: (
      <>
        <p>
          If you are a California resident, you have additional rights under the California Consumer Privacy
          Act (CCPA) as amended by the California Privacy Rights Act (CPRA):
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Right to Know</strong> — The right to know what personal
            information we collect, use, disclose, and share about you
          </li>
          <li>
            <strong className="text-navy-700">Right to Delete</strong> — The right to request deletion of
            your personal information, subject to certain exceptions
          </li>
          <li>
            <strong className="text-navy-700">Right to Correct</strong> — The right to request correction of
            inaccurate personal information we maintain about you
          </li>
          <li>
            <strong className="text-navy-700">Right to Opt-Out of Sale</strong> —{" "}
            <strong className="text-navy-700">
              HWRG does NOT sell personal information.
            </strong>{" "}
            We have not sold personal information in the preceding 12 months and have no plans to do so.
          </li>
          <li>
            <strong className="text-navy-700">Right to Limit Sensitive Data Use</strong> — We collect
            limited sensitive data (account credentials) used solely for authentication purposes and not
            shared with third parties
          </li>
          <li>
            <strong className="text-navy-700">Non-Discrimination</strong> — We will not deny services,
            charge different prices, or provide a lower quality of service because you exercised your
            CCPA rights
          </li>
        </ul>
        <p>
          We will respond to verified CCPA requests within{" "}
          <strong className="text-navy-700">45 calendar days</strong>. To submit a CCPA request, email{" "}
          {privacyEmail} with the subject line{" "}
          <strong className="text-navy-700">&ldquo;CCPA Request&rdquo;</strong> and a description of your
          request. We may need to verify your identity before processing the request.
        </p>
      </>
    ),
  },
  {
    id: "childrens-privacy",
    title: "9. Children's Privacy (COPPA)",
    content: (
      <>
        <p>
          Our website is not directed to children under 13 years of age. Account registration requires
          you to be at least <strong className="text-navy-700">18 years old</strong>. We do not knowingly
          collect personal information from children under 13.
        </p>
        <p>
          If we discover that we have inadvertently collected personal information from a child under 13
          years of age, we will take prompt steps to delete that information from our systems in accordance
          with the Children&rsquo;s Online Privacy Protection Act (COPPA).
        </p>
        <p>
          If you are a parent or guardian and believe that your child has provided personal information to
          us, please contact us immediately at {privacyEmail} so we can take appropriate action.
        </p>
      </>
    ),
  },
  {
    id: "data-security",
    title: "10. Data Security",
    content: (
      <>
        <p>
          We implement reasonable technical and organizational security measures to protect your personal
          information against unauthorized access, disclosure, alteration, or destruction. Our security
          measures include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>HTTPS/TLS encryption for all data transmitted between your browser and our servers</li>
          <li>Password hashing — passwords are never stored in plain text</li>
          <li>Supabase Row Level Security (RLS) policies to enforce database access controls</li>
          <li>Session token expiration and automatic logout after periods of inactivity</li>
          <li>Access controls limiting HWRG employee access to personal data on a need-to-know basis</li>
          <li>Regular security reviews of our systems and third-party service providers</li>
        </ul>
        <p>
          <strong className="text-navy-700">Florida Information Protection Act (FIPA) Breach
          Notification:</strong> In the event of a data breach affecting your personal information, we
          will notify affected users within 30 days as required by Florida Statute &sect;501.171. If 500
          or more Florida residents are affected by a single breach, we will also notify the Florida
          Department of Legal Affairs.
        </p>
        <p>
          No system is completely secure. While we implement reasonable safeguards, we cannot guarantee
          the absolute security of your personal information. You use the Site at your own risk.
        </p>
      </>
    ),
  },
  {
    id: "third-party-services",
    title: "11. Third-Party Service Links",
    content: (
      <>
        <p>
          The following are the privacy policies of our key third-party service providers. We encourage
          you to review these policies to understand how your data is handled by these services:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Google:</strong>{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://policies.google.com/privacy
            </a>
          </li>
          <li>
            <strong className="text-navy-700">Supabase:</strong>{" "}
            <a
              href="https://supabase.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://supabase.com/privacy
            </a>
          </li>
          <li>
            <strong className="text-navy-700">Vercel:</strong>{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://vercel.com/legal/privacy-policy
            </a>
          </li>
          <li>
            <strong className="text-navy-700">Resend:</strong>{" "}
            <a
              href="https://resend.com/legal/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://resend.com/legal/privacy-policy
            </a>
          </li>
        </ul>
        <p>
          These third-party services operate under their own privacy practices and policies. HWRG is not
          responsible for the privacy practices of these providers. We encourage you to review their
          privacy policies before using features that interact with these services.
        </p>
      </>
    ),
  },
  {
    id: "international-transfers",
    title: "12. International Data Transfers",
    content: (
      <>
        <p>
          HWRG is based in the <strong className="text-navy-700">United States</strong>, and our services
          are intended for users located in the United States. All personal information we collect is stored
          and processed on servers located in the United States.
        </p>
        <p>
          If you access the Site from outside the United States, please be aware that your personal
          information will be transferred to, stored in, and processed in the United States. Data protection
          laws in the United States may differ from those in your country of residence.
        </p>
        <p>
          We do not actively market to users in the European Union, the United Kingdom, or other
          jurisdictions with distinct data protection frameworks such as GDPR. If you are located in such
          a jurisdiction and have privacy concerns, please contact us at {privacyEmail}.
        </p>
      </>
    ),
  },
  {
    id: "privacy-inquiries",
    title: "13. Privacy Inquiries",
    content: (
      <>
        <p>
          For any privacy-related questions, requests, or concerns, please contact us using the information
          below. We are committed to responding within{" "}
          <strong className="text-navy-700">30 calendar days</strong>.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Email:</strong> {privacyEmail}
          </li>
          <li>
            <strong className="text-navy-700">Physical mail:</strong> Home Wise Realty Group, Inc.,
            217 N Westmonte Drive #2012, Altamonte Springs, FL 32714
          </li>
        </ul>
        <p>
          If you are not satisfied with our response or believe we have not addressed your concern
          appropriately, you may file a complaint with the following regulatory authorities:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Florida Attorney General:</strong>{" "}
            <a
              href="https://www.myfloridalegal.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://www.myfloridalegal.com/
            </a>
          </li>
          <li>
            <strong className="text-navy-700">Federal Trade Commission:</strong>{" "}
            <a
              href="https://www.ftc.gov/complaint"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://www.ftc.gov/complaint
            </a>
          </li>
          <li>
            <strong className="text-navy-700">California Privacy Protection Agency</strong>{" "}
            (California residents only):{" "}
            <a
              href="https://cppa.ca.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              https://cppa.ca.gov/
            </a>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "changes-to-policy",
    title: "14. Changes to This Policy",
    content: (
      <>
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices,
          technology, legal requirements, or other factors.
        </p>
        <p>
          <strong className="text-navy-700">Material changes:</strong> Registered users will be notified
          by email at least <strong className="text-navy-700">30 days before</strong> any material changes
          take effect. A material change is one that meaningfully affects your rights or how we handle
          your personal information.
        </p>
        <p>
          <strong className="text-navy-700">Non-material changes:</strong> Minor updates such as
          clarifications, corrections, or formatting changes will be reflected on this page with a new
          &ldquo;Last Updated&rdquo; date without prior notice.
        </p>
        <p>
          Your continued use of the Site after any changes to this Privacy Policy become effective
          constitutes your acceptance of the revised policy. If you do not agree to the updated policy,
          you must stop using the Site and may request deletion of your account by contacting us at{" "}
          {privacyEmail}.
        </p>
        <p>
          We encourage you to review this page periodically to stay informed about how we are protecting
          your information.
        </p>
      </>
    ),
  },
];
