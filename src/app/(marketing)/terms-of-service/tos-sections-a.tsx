import React from "react";

export type TosSection = { id: string; title: string; content: React.ReactNode };

const email = (
  <a href="mailto:info@homewisefl.com" className="text-crimson-600 hover:text-crimson-700 underline">
    info@homewisefl.com
  </a>
);

export const tosSectionsA: TosSection[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of Terms",
    content: (
      <>
        <p>
          By accessing or using <strong className="text-navy-700">homewisefl.com</strong> (the
          &ldquo;Site&rdquo;), you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;), our
          Privacy Policy, and all applicable laws and regulations. These Terms constitute a legally binding
          agreement between you and Home Wise Realty Group, Inc. (&ldquo;HWRG,&rdquo; &ldquo;we,&rdquo;
          &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
        <p>
          <strong className="text-navy-700">If you do not agree to these Terms, you must immediately
          discontinue all use of the Site.</strong> Your continued use of the Site following the posting of
          any changes to these Terms constitutes your acceptance of those changes.
        </p>
        <p>
          When you create an account on the Site, you will be presented with a checkbox explicitly
          acknowledging your acceptance of these Terms. Checking that box is a condition of registration and
          constitutes your electronic signature confirming your agreement.
        </p>
      </>
    ),
  },
  {
    id: "company-identification",
    title: "2. Company Identification & Licensing",
    content: (
      <>
        <p>The Site is operated by:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li><strong className="text-navy-700">Company:</strong> Home Wise Realty Group, Inc.</li>
          <li><strong className="text-navy-700">Address:</strong> 217 N Westmonte Drive #2012, Altamonte Springs, FL 32714</li>
          <li><strong className="text-navy-700">Florida Real Estate License:</strong> CQ1026984</li>
          <li>
            <strong className="text-navy-700">Regulatory Authority:</strong> Florida Real Estate Commission
            (FREC) / Florida Department of Business and Professional Regulation (DBPR)
          </li>
        </ul>
        <p>
          HWRG is a licensed real estate brokerage in the State of Florida. All real estate activities
          conducted through or in connection with the Site are subject to Florida real estate laws and
          regulations, including Chapter 475, Florida Statutes.
        </p>
      </>
    ),
  },
  {
    id: "description-of-services",
    title: "3. Description of Services",
    content: (
      <>
        <p>The Site provides the following services to users:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Real estate property search powered by MLS/IDX data feeds</li>
          <li>Agent directory to connect buyers and sellers with licensed agents</li>
          <li>Educational resources for buyers, sellers, and real estate consumers</li>
          <li>Mortgage calculator and home valuation request tools</li>
          <li>Property alerts and saved search functionality for registered users</li>
        </ul>
        <p>
          <strong className="text-navy-700">The Site does not provide legal, financial, tax, accounting,
          or appraisal advice.</strong> Nothing on this Site should be construed as professional advice in
          any of these areas. Always consult a qualified professional for guidance specific to your situation.
        </p>
        <p>
          <strong className="text-navy-700">No Brokerage Relationship Created by Site Use.</strong> Simply
          visiting or using this Site does not create a brokerage relationship between you and HWRG or any
          of its agents. Under Florida Statute &sect;475.278, a brokerage relationship is established only
          through a written agreement signed by both the brokerage and the consumer. Home evaluation or
          valuation requests submitted through the Site are informational only and do not constitute a formal
          appraisal or a commitment to represent you.
        </p>
      </>
    ),
  },
  {
    id: "mls-idx-disclaimer",
    title: "4. MLS/IDX Data Disclaimer",
    content: (
      <>
        <p className="font-semibold text-navy-700">
          IDX information is provided exclusively for consumers&rsquo; personal, non-commercial use and may
          not be used for any purpose other than to identify prospective properties consumers may be
          interested in purchasing. Information is deemed reliable but is not guaranteed accurate by the MLS
          or Home Wise Realty Group, Inc.
        </p>
        <p>
          Property listing data displayed on this Site is sourced from one or more Multiple Listing Services
          (MLS) through an Internet Data Exchange (IDX) program. The MLS and its participating brokers are
          the owners of the data and retain all proprietary rights thereto.
        </p>
        <p>
          Listing information is subject to change without notice. All listings are subject to prior sale,
          change, or withdrawal. HWRG shall not be liable for any inaccuracy, error, or omission in the
          listing data. Property data may not reflect the current status of a listing at the time you view it.
        </p>
        <p>
          <strong className="text-navy-700">Users are strongly encouraged to independently verify</strong>{" "}
          all property details including, without limitation: square footage, lot size, room dimensions,
          property features, school district assignments, zoning, HOA fees, and any other material facts
          before making any real estate decision.
        </p>
        <p>
          Use of IDX data is governed by NAR IDX Policy 7.58 and the rules of the applicable MLS. Any
          commercial use of MLS/IDX data is strictly prohibited. See Section 7 (Prohibited Uses) for more
          detail.
        </p>
      </>
    ),
  },
  {
    id: "user-accounts",
    title: "5. User Accounts",
    content: (
      <>
        <p>
          To access certain features of the Site, such as saving searches, receiving property alerts, or
          requesting home evaluations, you must create an account.
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            <strong className="text-navy-700">Age Requirement:</strong> You must be at least 18 years of age
            to create an account or use the Site.
          </li>
          <li>
            <strong className="text-navy-700">Registration Methods:</strong> The Site supports account
            creation via email and password, Google OAuth, or a passwordless magic link sent to your email
            address.
          </li>
          <li>
            <strong className="text-navy-700">Accurate Information:</strong> You agree to provide truthful,
            accurate, current, and complete information during registration and to keep your account
            information updated at all times.
          </li>
          <li>
            <strong className="text-navy-700">Account Security:</strong> You are solely responsible for
            maintaining the confidentiality of your login credentials. Do not share your password or magic
            link with any third party.
          </li>
          <li>
            <strong className="text-navy-700">Account Activity:</strong> You are responsible for all
            activity that occurs under your account, whether or not authorized by you. Notify us immediately
            at {email} if you suspect unauthorized access.
          </li>
          <li>
            <strong className="text-navy-700">Suspension & Termination:</strong> HWRG reserves the right to
            suspend, restrict, or terminate your account at any time, with or without notice, for violation
            of these Terms or any conduct that HWRG deems harmful to the Site or its users.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "user-generated-content",
    title: "6. User-Generated Content",
    content: (
      <>
        <p>
          The Site may allow you to submit certain content, including but not limited to contact form
          submissions, property inquiry messages, saved search names, property notes, and home evaluation
          requests (collectively, &ldquo;User Content&rdquo;).
        </p>
        <p>
          By submitting User Content, you grant HWRG a non-exclusive, worldwide, royalty-free license to
          use, store, process, and display your User Content solely to the extent necessary to provide the
          services requested by you. We do not claim ownership of your User Content.
        </p>
        <p>
          You represent and warrant that: (a) you own or have the right to submit the User Content; (b) your
          User Content is accurate and not misleading; and (c) your User Content does not violate any
          applicable law or the rights of any third party.
        </p>
        <p>
          HWRG reserves the right, but not the obligation, to review, edit, refuse to post, or remove any
          User Content at its sole discretion for any reason, including content that violates these Terms or
          that HWRG finds objectionable.
        </p>
      </>
    ),
  },
  {
    id: "prohibited-uses",
    title: "7. Prohibited Uses",
    content: (
      <>
        <p>You agree that you will not use the Site or its content for any of the following purposes:</p>
        <ul className="list-disc pl-6 space-y-2">
          <li>
            Using MLS/IDX data or any Site content for any commercial purpose, including aggregation,
            resale, redistribution, or incorporation into competing services
          </li>
          <li>
            Scraping, data mining, crawling, spidering, or using automated means to collect content, data,
            or information from the Site
          </li>
          <li>
            Attempting to gain unauthorized access to any account, computer system, network, or database
            connected to the Site
          </li>
          <li>Impersonating any person or entity, including any HWRG agent, employee, or another user</li>
          <li>
            Interfering with, disrupting, or degrading the operation of the Site or other users&rsquo; access
            to the Site, including through denial-of-service attacks or the introduction of malicious code
          </li>
          <li>Using the Site for any unlawful, fraudulent, or deceptive purpose</li>
          <li>
            Reproducing, publishing, distributing, or creating derivative works from Site content without
            prior written permission from HWRG
          </li>
          <li>
            Transmitting unsolicited commercial messages, spam, or chain letters through any Site feature
            or to other users of the Site
          </li>
        </ul>
        <p>
          Violation of these prohibitions may result in immediate account termination and may expose you to
          civil and/or criminal liability.
        </p>
      </>
    ),
  },
  {
    id: "intellectual-property",
    title: "8. Intellectual Property",
    content: (
      <>
        <p>
          The Site and all of its content, including but not limited to text, graphics, logos, button icons,
          images, audio clips, digital downloads, data compilations, software, and the overall design and
          compilation of the Site, are the property of HWRG or its content suppliers and are protected by
          United States and international copyright, trademark, and other intellectual property laws.
        </p>
        <p>
          MLS/IDX listing data displayed on the Site is owned by the respective listing brokers and the
          applicable Multiple Listing Service. HWRG has a limited license to display this data subject to
          MLS and NAR IDX rules. No ownership rights in listing data are transferred to users of the Site.
        </p>
        <p>
          <strong className="text-navy-700">DMCA Copyright Notice.</strong> If you believe that any content
          on the Site infringes your copyright, please send a written notice of claimed infringement to{" "}
          {email}. Your notice must include:
        </p>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Identification of the copyrighted work you claim has been infringed</li>
          <li>
            Identification of the material on the Site that you claim is infringing, with sufficient detail
            to locate it
          </li>
          <li>Your name, mailing address, telephone number, and email address</li>
          <li>
            A statement that you have a good faith belief that the disputed use is not authorized by the
            copyright owner, its agent, or the law
          </li>
          <li>
            A statement, made under penalty of perjury, that the information in your notice is accurate and
            that you are the copyright owner or authorized to act on the owner&rsquo;s behalf
          </li>
        </ol>
      </>
    ),
  },
  {
    id: "mortgage-calculator",
    title: "9. Mortgage Calculator Disclaimer",
    content: (
      <>
        <p>
          The mortgage calculator tool available on the Site is provided solely for general informational
          and educational purposes. Results generated by the calculator are <strong className="text-navy-700">
          estimates only</strong> based on the inputs you provide and publicly available rate assumptions.
        </p>
        <p>
          The mortgage calculator does <strong className="text-navy-700">not</strong> constitute:
        </p>
        <ul className="list-disc pl-6 space-y-2">
          <li>Financial, investment, or mortgage advice of any kind</li>
          <li>A loan pre-qualification, pre-approval, or commitment to lend</li>
          <li>A guarantee or lock of any interest rate or loan terms</li>
        </ul>
        <p>
          Actual mortgage rates, monthly payments, loan fees, and eligibility depend on many factors
          including your credit score, debt-to-income ratio, down payment, loan type, lender policies, and
          current market conditions. These factors may cause actual figures to differ significantly from
          calculator estimates.
        </p>
        <p>
          Property tax and homeowner&rsquo;s insurance figures used in payment estimates are approximations
          only. Please consult a licensed mortgage loan originator or financial advisor for accurate figures
          tailored to your specific financial circumstances.
        </p>
      </>
    ),
  },
];
