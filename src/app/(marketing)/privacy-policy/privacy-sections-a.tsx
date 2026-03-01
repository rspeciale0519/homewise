import React from "react";

export type PrivacySection = { id: string; title: string; content: React.ReactNode };

const privacyEmail = (
  <a href="mailto:privacy@homewisefl.com" className="text-crimson-600 hover:text-crimson-700 underline">
    privacy@homewisefl.com
  </a>
);

export const privacySectionsA: PrivacySection[] = [
  {
    id: "introduction",
    title: "1. Introduction",
    content: (
      <>
        <p>
          This Privacy Policy describes how <strong className="text-navy-700">Home Wise Realty Group, Inc.</strong>{" "}
          (&ldquo;HWRG,&rdquo; &ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) collects, uses, shares,
          and protects your personal information when you visit or use{" "}
          <strong className="text-navy-700">homewisefl.com</strong> and all features and services offered through
          the site (collectively, the &ldquo;Site&rdquo;).
        </p>
        <p>
          <strong className="text-navy-700">Effective Date: March 1, 2026.</strong> By using the Site, you
          acknowledge that you have read and understood this Privacy Policy.
        </p>
        <p>
          <strong className="text-navy-700">HWRG does NOT sell your personal information to third parties —
          period.</strong> We collect only the information reasonably necessary to provide you with property
          search tools, account features, and the ability to connect with our agents when you choose to do so.
        </p>
      </>
    ),
  },
  {
    id: "information-collected",
    title: "2. Information We Collect",
    content: (
      <>
        <p>We collect personal information in three ways: directly from you, automatically through your use of the Site, and from select third-party services.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Category</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Data Type</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Collection Method</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200 align-top font-medium text-navy-700">Directly Provided</td>
                <td className="p-3 border border-slate-200 align-top">
                  Name, email, phone (contact forms); first/last name, email, password (account registration);
                  property search criteria (saved searches); property notes (favorites); contact form messages,
                  home evaluation requests, buyer request forms; preferred agent selection
                </td>
                <td className="p-3 border border-slate-200 align-top">You enter it into forms or account settings</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 align-top font-medium text-navy-700">Automatically Collected</td>
                <td className="p-3 border border-slate-200 align-top">
                  IP address, browser type and version, operating system, device type; pages visited, search
                  queries, time spent on pages; referring URLs; cookies and similar technologies
                </td>
                <td className="p-3 border border-slate-200 align-top">Collected automatically when you use the Site</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 align-top font-medium text-navy-700">From Third Parties</td>
                <td className="p-3 border border-slate-200 align-top">
                  Google LLC: name, email, profile photo (OAuth only — we do NOT access your contacts, calendar,
                  or other Google data); MLS/IDX property listing data (not user data); Google Analytics:
                  aggregated usage data
                </td>
                <td className="p-3 border border-slate-200 align-top">Received when you sign in with Google or from analytics services</td>
              </tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    id: "how-we-use-information",
    title: "3. How We Use Your Information",
    content: (
      <>
        <p>We use the personal information we collect for the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>To provide and maintain our services, including property search, saved searches, and property alerts</li>
          <li>To create and manage your user account</li>
          <li>To send property alerts and saved search notifications you have opted into</li>
          <li>To respond to contact form inquiries and home evaluation requests</li>
          <li>To connect you with agents in our network, but only when you explicitly request it</li>
          <li>To improve our website through analytics (Google Analytics)</li>
          <li>To communicate account-related information such as password resets and security notices</li>
          <li>To comply with applicable legal obligations</li>
        </ul>
        <p>
          <strong className="text-navy-700">We do NOT:</strong> sell your data to third parties, use your data
          for behavioral advertising or retargeting, or share your data with lenders, title companies, or other
          companies without your explicit consent.
        </p>
      </>
    ),
  },
  {
    id: "how-we-share-information",
    title: "4. How We Share Your Information",
    content: (
      <>
        <p>
          We share personal information only with the service providers necessary to operate the Site and
          deliver our services. We do not sell or rent your personal information.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Service Provider</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Purpose</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Data Shared</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Location</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Supabase, Inc.</td>
                <td className="p-3 border border-slate-200">Authentication &amp; database</td>
                <td className="p-3 border border-slate-200">Account credentials (hashed), saved searches, favorites, form data</td>
                <td className="p-3 border border-slate-200">United States (SOC&nbsp;2 Type&nbsp;II certified)</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Google LLC</td>
                <td className="p-3 border border-slate-200">OAuth login &amp; Analytics</td>
                <td className="p-3 border border-slate-200">Name, email, photo (OAuth); aggregated usage data (GA4)</td>
                <td className="p-3 border border-slate-200">United States</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Resend, Inc.</td>
                <td className="p-3 border border-slate-200">Email delivery</td>
                <td className="p-3 border border-slate-200">Email address, notification content</td>
                <td className="p-3 border border-slate-200">United States</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Vercel, Inc.</td>
                <td className="p-3 border border-slate-200">Website hosting</td>
                <td className="p-3 border border-slate-200">Server logs, IP addresses</td>
                <td className="p-3 border border-slate-200">United States</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">HWRG Agents</td>
                <td className="p-3 border border-slate-200">Service delivery</td>
                <td className="p-3 border border-slate-200">Contact info when you request agent assistance</td>
                <td className="p-3 border border-slate-200">United States</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>We may also disclose personal information in the following circumstances:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Legal process</strong> — in response to a valid subpoena, court
            order, or government request
          </li>
          <li>
            <strong className="text-navy-700">Protection of rights</strong> — to protect the safety, rights,
            or property of HWRG, its users, or the public
          </li>
          <li>
            <strong className="text-navy-700">Business transfer</strong> — in connection with a merger,
            acquisition, or sale of assets (registered users will be notified in advance)
          </li>
          <li>
            <strong className="text-navy-700">With your consent</strong> — for any other purpose with your
            explicit prior consent
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "cookies-tracking",
    title: "5. Cookies & Tracking Technologies",
    content: (
      <>
        <p>
          We use cookies and similar tracking technologies to operate the Site and understand how it is used.
          The table below describes the types of cookies we use:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Cookie Type</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Purpose</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Can Be Disabled?</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Strictly Necessary</td>
                <td className="p-3 border border-slate-200">Supabase session tokens, CSRF protection, login state</td>
                <td className="p-3 border border-slate-200">No — required for site functionality</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Analytics</td>
                <td className="p-3 border border-slate-200">Google Analytics (GA4) — page views, user flows, site performance</td>
                <td className="p-3 border border-slate-200">Yes — see opt-out instructions below</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200 font-medium text-navy-700">Third-Party</td>
                <td className="p-3 border border-slate-200">Google Maps (embedded maps on property and community pages)</td>
                <td className="p-3 border border-slate-200">Governed by Google&rsquo;s Privacy Policy</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong className="text-navy-700">How to opt out of analytics cookies:</strong>
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Google Analytics:</strong> Install the{" "}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              className="text-crimson-600 hover:text-crimson-700 underline"
            >
              Google Analytics Opt-out Browser Add-on
            </a>{" "}
            to prevent your data from being used by Google Analytics across all sites.
          </li>
          <li>
            <strong className="text-navy-700">Browser settings:</strong> Most browsers allow you to block or
            delete cookies through their privacy or security settings.
          </li>
        </ul>
        <p>
          Please note that disabling strictly necessary cookies may prevent login and other core Site features
          from functioning correctly.
        </p>
      </>
    ),
  },
  {
    id: "data-retention",
    title: "6. Data Retention",
    content: (
      <>
        <p>
          We retain personal information only as long as necessary to provide our services and comply with
          legal obligations. The table below summarizes our standard retention periods:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Data Type</th>
                <th className="text-left p-3 bg-navy-50 text-navy-700 font-semibold border border-slate-200">Retention Period</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-slate-200">Active user accounts</td>
                <td className="p-3 border border-slate-200">Retained until you request deletion</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Contact form submissions</td>
                <td className="p-3 border border-slate-200">2 years from submission date</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Home evaluation requests</td>
                <td className="p-3 border border-slate-200">2 years from submission date</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Server and access logs</td>
                <td className="p-3 border border-slate-200">90 days</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Email delivery logs</td>
                <td className="p-3 border border-slate-200">3 years</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Saved searches and favorites</td>
                <td className="p-3 border border-slate-200">Retained until you delete them or close your account</td>
              </tr>
              <tr>
                <td className="p-3 border border-slate-200">Database backups</td>
                <td className="p-3 border border-slate-200">Purged within 90 days of account deletion</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          <strong className="text-navy-700">Legal hold exception:</strong> Data may be retained for a longer
          period if required by applicable law, regulation, or legal proceedings. In such cases, we will retain
          only the minimum data necessary for the duration of the legal obligation.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "7. Your Rights",
    content: (
      <>
        <p>Regardless of where you are located, you have the following rights with respect to your personal information:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Access</strong> — Request a copy of the personal data we hold
            about you
          </li>
          <li>
            <strong className="text-navy-700">Correction</strong> — Request correction of inaccurate or
            incomplete personal data
          </li>
          <li>
            <strong className="text-navy-700">Deletion</strong> — Request deletion of your personal data and
            account
          </li>
          <li>
            <strong className="text-navy-700">Opt-Out</strong> — Unsubscribe from marketing emails at any
            time via the unsubscribe link in any email we send
          </li>
          <li>
            <strong className="text-navy-700">Data Portability</strong> — Request a copy of your data in a
            structured, commonly used, machine-readable format
          </li>
        </ul>
        <p>
          We will respond to all rights requests within <strong className="text-navy-700">30 calendar days</strong>{" "}
          of receipt. To exercise any of these rights, email us at {privacyEmail} with a clear description
          of your request.
        </p>
        <p>
          <strong className="text-navy-700">We will not discriminate against you</strong> for exercising
          any of these rights. Exercising your rights will not result in denial of services, different pricing,
          or lower quality of service.
        </p>
      </>
    ),
  },
];
