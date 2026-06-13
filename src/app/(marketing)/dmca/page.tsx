import type { Metadata } from "next";
import { DMCA_AGENT_EMAIL, SITE_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "DMCA Notice | Home Wise Realty Group",
  description:
    "Digital Millennium Copyright Act notice and takedown procedure for content displayed on this website.",
};

export default function DmcaPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-700 mb-2">
        DMCA Notice
      </h1>
      <p className="text-slate-500 mb-8">
        Copyright infringement notification procedure for {SITE_NAME}.
      </p>

      <div className="space-y-5 text-sm leading-relaxed text-slate-600">
        <p>
          The Digital Millennium Copyright Act of 1998, 17 U.S.C. § 512 (the
          &ldquo;DMCA&rdquo;) provides recourse for copyright owners who believe that
          material appearing on the Internet infringes their rights under U.S.
          copyright law. If you believe in good faith that any content or material
          made available in connection with our website or services infringes your
          copyright, you (or your agent) may send us a notice requesting that the
          content or material be removed, or access to it blocked. Notices must be
          sent in writing by email to:{" "}
          <a href={`mailto:${DMCA_AGENT_EMAIL}`} className="font-medium text-navy-700 underline">
            {DMCA_AGENT_EMAIL}
          </a>
          .
        </p>
        <p>
          The DMCA requires that your notice of alleged copyright infringement
          include the following information: (1) description of the copyrighted work
          that is the subject of claimed infringement; (2) description of the alleged
          infringing content and information sufficient to permit us to locate the
          content; (3) contact information for you, including your address, telephone
          number and email address; (4) a statement by you that you have a good faith
          belief that the content in the manner complained of is not authorized by
          the copyright owner, or its agent, or by the operation of any law; (5) a
          statement by you, signed under penalty of perjury, that the information in
          the notification is accurate and that you have the authority to enforce the
          copyrights that are claimed to be infringed; and (6) a physical or
          electronic signature of the copyright owner or a person authorized to act
          on the copyright owner&rsquo;s behalf. Failure to include all of the above
          information may result in the delay of the processing of your complaint.
        </p>
        <p className="text-xs text-slate-400">
          Listing data on this website is provided by Stellar MLS as distributed by
          MLS GRID.
        </p>
      </div>
    </div>
  );
}
