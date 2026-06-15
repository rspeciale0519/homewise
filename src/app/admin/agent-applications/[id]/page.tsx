import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AgentApplicationReview } from "@/components/admin/agent-application-review";
import { SITE_URL } from "@/lib/constants";

export default async function AgentApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const application = await prisma.agentApplication.findUnique({ where: { id } });
  if (!application) notFound();

  let inviteUrl: string | null = null;
  if (application.agentId) {
    const agent = await prisma.agent.findUnique({
      where: { id: application.agentId },
      select: { inviteCode: true, inviteUsed: true },
    });
    if (agent?.inviteCode && !agent.inviteUsed) {
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
      inviteUrl = `${baseUrl}/register?invite=${agent.inviteCode}`;
    }
  }

  const fields: { label: string; value: string | null }[] = [
    { label: "Email", value: application.email },
    { label: "Phone", value: application.phone },
    { label: "License #", value: application.licenseNumber },
    { label: "Has MLS Access", value: application.hasMlsAccess ? "Yes" : "No" },
    { label: "MLS Agent ID", value: application.mlsAgentId },
    { label: "Applied", value: new Date(application.createdAt).toLocaleString() },
  ];

  return (
    <div className="max-w-2xl">
      <Link href="/admin/agent-applications" className="text-sm text-slate-500 hover:text-navy-700 transition-colors">
        ← Back to applications
      </Link>

      <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mt-3 mb-6">
        {application.firstName} {application.lastName}
      </h1>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 mb-5">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
          {fields.map((f) => (
            <div key={f.label}>
              <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{f.label}</dt>
              <dd className="text-sm text-navy-700 mt-0.5">{f.value ?? "—"}</dd>
            </div>
          ))}
        </dl>
        {application.message && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Message</dt>
            <dd className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{application.message}</dd>
          </div>
        )}
        {application.reviewNotes && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Review Notes</dt>
            <dd className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">{application.reviewNotes}</dd>
          </div>
        )}
      </div>

      <AgentApplicationReview id={application.id} status={application.status} inviteUrl={inviteUrl} />
    </div>
  );
}
