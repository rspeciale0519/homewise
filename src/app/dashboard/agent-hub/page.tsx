import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import {
  COMPANY_IDENTIFIERS,
  QUICK_ACCESS_DOCUMENTS,
  FORM_CATEGORIES,
} from "@/data/content/agent-resources";
import { PHONE, FAX } from "@/lib/constants";

export default async function AgentHubPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent") {
    return <AccessDenied />;
  }

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-crimson-600 mb-2">
          Agent Tools
        </p>
        <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
          Resources Hub
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Company information, quick access documents, and form libraries.
        </p>
      </div>

      {/* Company Identifiers */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-4">
          Company Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <IdentifierCard label="HUD NAID#" value={COMPANY_IDENTIFIERS.hudNaid} />
          <IdentifierCard label="Tax ID" value={COMPANY_IDENTIFIERS.taxId} />
          <IdentifierCard label="DBPR License" value={COMPANY_IDENTIFIERS.dbprLicense} />
          <IdentifierCard label="ORRA MLS Office ID" value={COMPANY_IDENTIFIERS.orraMlsId} />
        </div>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <ContactCard
            label="Office Phone"
            value={PHONE}
            href={`tel:${PHONE.replace(/\D/g, "")}`}
            icon="phone"
          />
          <ContactCard
            label="Office Fax"
            value={FAX}
            icon="fax"
          />
        </div>
      </section>

      {/* Quick Access Documents */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-4">
          Quick Access
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {QUICK_ACCESS_DOCUMENTS.map((doc) => {
            const isExternal = doc.external === true;
            return (
              <a
                key={doc.name}
                href={doc.url}
                {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : { download: true })}
                className="group flex items-center gap-3 p-4 rounded-xl bg-white border border-slate-100 hover:border-crimson-200 hover:shadow-sm transition-all duration-200"
              >
                <div className="shrink-0 h-10 w-10 rounded-lg bg-crimson-50 group-hover:bg-crimson-100 flex items-center justify-center transition-colors">
                  <svg className="h-5 w-5 text-crimson-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors truncate">
                    {doc.name}
                  </p>
                  {doc.description && (
                    <p className="text-xs text-slate-500 truncate">{doc.description}</p>
                  )}
                </div>
                <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 shrink-0 transition-all group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </a>
            );
          })}
        </div>
      </section>

      {/* Document Libraries */}
      <section className="mb-10">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-4">
          Document Libraries
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {FORM_CATEGORIES.map((category) => (
            <Link
              key={category.title}
              href="/dashboard/agent-hub/documents"
              className="group relative p-5 rounded-2xl bg-white border border-slate-100 hover:border-crimson-200 hover:shadow-card transition-all duration-300"
            >
              <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl bg-gradient-to-r from-crimson-600 to-navy-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="h-11 w-11 rounded-xl bg-navy-50 group-hover:bg-crimson-50 flex items-center justify-center mb-3 transition-colors">
                <CategoryIcon icon={category.icon} />
              </div>
              <h3 className="font-serif text-base font-semibold text-navy-700 group-hover:text-crimson-700 transition-colors mb-1">
                {category.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-3">
                {category.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full">
                  {category.count} documents
                </span>
                <svg className="h-4 w-4 text-slate-300 group-hover:text-crimson-500 transition-all group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Transaction Desk callout */}
      <div className="p-5 rounded-xl bg-navy-50 border border-navy-100 flex items-start gap-4">
        <div className="shrink-0 h-10 w-10 rounded-lg bg-navy-100 flex items-center justify-center">
          <svg className="h-5 w-5 text-navy-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-navy-700 mb-1">Transaction Desk</p>
          <p className="text-sm text-slate-600 leading-relaxed">
            All forms and documents are also available through Transaction Desk. For the most up-to-date versions, please access documents through your Transaction Desk account.
          </p>
        </div>
      </div>
    </div>
  );
}

function IdentifierCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-white border border-slate-100">
      <p className="text-xs text-slate-400 font-medium mb-0.5">{label}</p>
      <p className="text-base font-semibold text-navy-700 font-mono tracking-wide">{value}</p>
    </div>
  );
}

function ContactCard({
  label,
  value,
  href,
  icon,
}: {
  label: string;
  value: string;
  href?: string;
  icon: "phone" | "fax";
}) {
  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href } : {};

  return (
    <Wrapper
      {...wrapperProps}
      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-100"
    >
      {icon === "phone" ? (
        <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
        </svg>
      ) : (
        <svg className="h-4 w-4 text-crimson-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18.75 3.75H5.25" />
        </svg>
      )}
      <div>
        <p className="text-xs text-slate-400 font-medium">{label}</p>
        <p className="text-sm font-semibold text-navy-700">{value}</p>
      </div>
    </Wrapper>
  );
}

function CategoryIcon({ icon }: { icon: "building" | "clipboard" | "document" }) {
  const className = "h-5 w-5 text-navy-400 group-hover:text-crimson-600 transition-colors";
  switch (icon) {
    case "building":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
        </svg>
      );
    case "clipboard":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
        </svg>
      );
    case "document":
      return (
        <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      );
  }
}
