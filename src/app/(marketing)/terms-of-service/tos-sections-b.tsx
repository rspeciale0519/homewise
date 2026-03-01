import React from "react";
import type { TosSection } from "./tos-sections-a";

const email = (
  <a href="mailto:info@homewisefl.com" className="text-crimson-600 hover:text-crimson-700 underline">
    info@homewisefl.com
  </a>
);

export const tosSectionsB: TosSection[] = [
  {
    id: "disclaimer-of-warranties",
    title: "10. Disclaimer of Warranties",
    content: (
      <>
        <p className="font-semibold text-navy-700 uppercase">
          The site and all content, information, services, and materials available through the site are
          provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranties of any kind,
          either express or implied.
        </p>
        <p className="font-semibold text-navy-700 uppercase">
          To the fullest extent permitted by applicable law, HWRG expressly disclaims all warranties,
          including but not limited to implied warranties of merchantability, fitness for a particular
          purpose, title, and non-infringement.
        </p>
        <p className="font-semibold text-navy-700 uppercase">
          HWRG makes no warranty or representation that: (a) the site will meet your requirements; (b)
          the site will be available on an uninterrupted, timely, secure, or error-free basis; (c)
          property listings or other information on the site will be accurate, complete, reliable,
          current, or free of errors; or (d) any defects in the site will be corrected.
        </p>
        <p>
          You expressly acknowledge that the use of the Site is at your sole risk and that you are solely
          responsible for any damage to your computer or other device or loss of data that results from
          use of the Site.
        </p>
      </>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "11. Limitation of Liability",
    content: (
      <>
        <p className="font-semibold text-navy-700 uppercase">
          To the maximum extent permitted by applicable law, in no event shall HWRG, its officers,
          directors, employees, agents, licensors, or service providers be liable for any indirect,
          incidental, special, consequential, exemplary, or punitive damages, including but not limited
          to loss of profits, loss of data, loss of goodwill, business interruption, or the cost of
          substitute services, arising out of or in connection with your use of or inability to use the
          site or its content.
        </p>
        <p className="font-semibold text-navy-700 uppercase">
          HWRG&rsquo;s total cumulative liability to you for all claims arising out of or related to
          your use of the site shall not exceed the greater of: (a) one hundred dollars ($100.00); or
          (b) the total fees actually paid by you to HWRG during the twelve (12) months immediately
          preceding the event giving rise to the claim.
        </p>
        <p className="font-semibold text-navy-700 uppercase">
          This limitation of liability applies regardless of the legal theory on which the claim is
          based, including contract, tort, negligence, strict liability, or any other legal or equitable
          theory, and even if HWRG has been advised of the possibility of such damages.
        </p>
        <p>
          Some jurisdictions do not allow the exclusion or limitation of incidental or consequential
          damages, so the above limitations may not apply to you in full. In such jurisdictions,
          HWRG&rsquo;s liability shall be limited to the maximum extent permitted by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnification",
    title: "12. Indemnification",
    content: (
      <>
        <p>
          You agree to defend, indemnify, and hold harmless HWRG and its officers, directors,
          shareholders, employees, agents, licensors, and service providers from and against any and all
          claims, liabilities, damages, judgments, awards, losses, costs, expenses, and fees (including
          reasonable attorneys&rsquo; fees) arising out of or relating to:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Your access to or use of the Site or any of its content</li>
          <li>Your violation of any provision of these Terms</li>
          <li>
            Your unauthorized use or commercial exploitation of MLS/IDX listing data obtained through
            the Site
          </li>
          <li>
            Any false, inaccurate, or misleading information submitted through any form or feature of
            the Site
          </li>
          <li>Your violation of any applicable federal, state, or local law or regulation</li>
          <li>Your infringement of any intellectual property or other rights of any third party</li>
        </ul>
        <p>
          HWRG reserves the right, at its own expense, to assume the exclusive defense and control of
          any matter otherwise subject to indemnification by you. You agree to cooperate fully with
          HWRG in asserting any available defenses.
        </p>
      </>
    ),
  },
  {
    id: "third-party-links",
    title: "13. Third-Party Links & Services",
    content: (
      <>
        <p>
          The Site may contain links to or integrations with third-party websites, services, or resources
          that are not owned or controlled by HWRG. These may include, but are not limited to, links to
          mortgage lenders, home inspectors, title companies, insurance providers, and mapping services
          such as Google Maps.
        </p>
        <p>
          <strong className="text-navy-700">HWRG does not endorse, approve, control, or assume
          responsibility for</strong> any third-party website, service, content, advertising, product,
          or resource. HWRG is not responsible for the availability, accuracy, reliability, or legality
          of any third-party content.
        </p>
        <p>
          Any dealings you have with third parties found through or linked from the Site, including the
          delivery of goods and services and payment for such goods or services, are solely between you
          and the applicable third party. You access and use third-party websites and services entirely
          at your own risk, and subject to the terms and conditions and privacy policies of those
          third parties.
        </p>
      </>
    ),
  },
  {
    id: "email-communications",
    title: "14. Email Communications",
    content: (
      <>
        <p>
          By creating an account or subscribing to property alerts or search notifications, you consent
          to receive email communications from HWRG. These communications may include:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>New listing alerts matching your saved search criteria</li>
          <li>Price change and status update notifications for saved properties</li>
          <li>Account-related messages (registration confirmation, password reset, security alerts)</li>
          <li>Periodic market updates and educational content (if opted in)</li>
        </ul>
        <p>
          All marketing and promotional emails from HWRG comply with the CAN-SPAM Act. Every such email
          will include: (a) a clear identification of HWRG as the sender; (b) our physical mailing
          address at <strong className="text-navy-700">217 N Westmonte Drive #2012, Altamonte Springs,
          FL 32714</strong>; and (c) a clear and conspicuous mechanism for you to opt out of receiving
          future marketing emails.
        </p>
        <p>
          Unsubscribe requests submitted through the opt-out link in any email will be processed and
          honored within <strong className="text-navy-700">10 business days</strong> of receipt. Please
          note that transactional and account-related emails&mdash;such as password reset requests,
          security notifications, and account activity alerts&mdash;are necessary for the operation of
          your account and cannot be unsubscribed from while your account remains active.
        </p>
      </>
    ),
  },
  {
    id: "brokerage-relationship",
    title: "15. Brokerage Relationship Notice",
    content: (
      <>
        <p>
          <strong className="text-navy-700">Use of this Site does not create a brokerage relationship
          of any kind between you and HWRG or any of its licensed agents.</strong>
        </p>
        <p>
          Pursuant to Florida Statute &sect;475.278, Florida law recognizes three types of brokerage
          relationships:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Transaction Broker:</strong> The broker assists the buyer
            and/or seller in a real estate transaction but does not represent either party as a fiduciary.
            This is the default relationship in Florida.
          </li>
          <li>
            <strong className="text-navy-700">Single Agent:</strong> The broker represents only one party
            (either the buyer or seller) and owes that party full fiduciary duties.
          </li>
          <li>
            <strong className="text-navy-700">No Brokerage Relationship:</strong> The broker works with
            a buyer or seller without representing them in any capacity.
          </li>
        </ul>
        <p>
          A brokerage relationship with HWRG is only established when both you and HWRG have signed a
          written brokerage agreement specifying the nature of the relationship.{" "}
          <strong className="text-navy-700">Dual agency (representing both buyer and seller as a single
          agent) is prohibited under Florida law.</strong>
        </p>
        <p>
          For questions regarding brokerage relationships or to discuss entering into a representation
          agreement, please contact us at {email}.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "16. Governing Law & Jurisdiction",
    content: (
      <>
        <p>
          These Terms and any dispute or claim arising out of or related to them, their subject matter,
          or their formation (including non-contractual disputes or claims) shall be governed by and
          construed in accordance with the laws of the{" "}
          <strong className="text-navy-700">State of Florida</strong>, without giving effect to any
          conflict of law or choice of law provisions.
        </p>
        <p>
          Subject to the dispute resolution provisions in Section 17, you and HWRG each consent to the
          exclusive personal jurisdiction of the state and federal courts located in{" "}
          <strong className="text-navy-700">Seminole County, Florida</strong> for the resolution of any
          dispute not subject to arbitration. You waive any objection to venue in such courts based on
          improper venue or inconvenient forum.
        </p>
        <p>
          <strong className="text-navy-700">Severability.</strong> If any provision of these Terms is
          found by a court of competent jurisdiction to be invalid, illegal, or unenforceable, that
          provision shall be enforced to the maximum extent permissible, and the remaining provisions of
          these Terms shall continue in full force and effect without modification.
        </p>
      </>
    ),
  },
  {
    id: "dispute-resolution",
    title: "17. Dispute Resolution",
    content: (
      <>
        <p>
          We encourage you to contact us first if you have a concern. Most disputes can be resolved
          quickly and informally. Please follow these steps before initiating any formal proceeding:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Step 1 &mdash; Informal Resolution:</strong> Send a
            written description of your dispute to {email}. You and HWRG agree to negotiate in good
            faith for a period of <strong className="text-navy-700">30 days</strong> from the date
            HWRG receives your notice before either party initiates arbitration or litigation.
          </li>
          <li>
            <strong className="text-navy-700">Step 2 &mdash; Binding Arbitration:</strong> If the
            dispute is not resolved through informal negotiation, it shall be submitted to final and
            binding arbitration administered by the{" "}
            <strong className="text-navy-700">American Arbitration Association (AAA)</strong> under its
            Consumer Arbitration Rules then in effect. The arbitration shall be conducted in Seminole
            County, Florida, or by telephone or videoconference at either party&rsquo;s request.
          </li>
        </ol>
        <p className="font-semibold text-navy-700 uppercase">
          Class Action Waiver: You agree that any arbitration or legal proceeding shall be conducted
          solely on an individual basis and not as a class action, consolidated action, or
          representative action. You expressly waive any right to participate in any class action
          lawsuit or class-wide arbitration relating to the site or these terms.
        </p>
        <p>
          <strong className="text-navy-700">Exceptions.</strong> Notwithstanding the foregoing, either
          party may seek emergency injunctive or other equitable relief from a court of competent
          jurisdiction to prevent actual or threatened infringement of intellectual property rights.
          Either party may also bring an individual claim in small claims court provided the claim
          qualifies and remains in such court.
        </p>
      </>
    ),
  },
  {
    id: "changes-to-terms",
    title: "18. Changes to Terms",
    content: (
      <>
        <p>
          HWRG reserves the right to modify, update, or replace these Terms at any time at its sole
          discretion. We will determine whether a change is material based on its potential impact on
          your rights and obligations under these Terms.
        </p>
        <p>
          <strong className="text-navy-700">Notification of Material Changes:</strong> For any material
          changes to these Terms, HWRG will provide at least{" "}
          <strong className="text-navy-700">30 days&rsquo; advance notice</strong> by:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Sending an email notification to registered users at the email address associated with
            their account
          </li>
          <li>Posting a prominent notice on the Site indicating that the Terms have been updated</li>
        </ul>
        <p>
          Your continued use of the Site after any changes to these Terms become effective constitutes
          your binding acceptance of those changes. If you do not agree to the revised Terms, you must
          stop using the Site before the changes take effect and may request deletion of your account
          by contacting us at {email}.
        </p>
        <p>
          We recommend that you review this page periodically to stay informed of any updates. The
          &ldquo;Last Updated&rdquo; date at the top of this page indicates when these Terms were most
          recently revised.
        </p>
      </>
    ),
  },
];
