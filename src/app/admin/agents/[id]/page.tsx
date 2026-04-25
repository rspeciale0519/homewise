import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { BackButton } from "@/components/ui/back-button";
import { AgentForm } from "@/components/admin/agent-form";
import { AgentInviteLink } from "@/components/admin/agent-invite-link";

export default async function AdminEditAgentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const agent = await prisma.agent.findUnique({ where: { id } });
  if (!agent) notFound();

  return (
    <div className="max-w-5xl">
      <BackButton
        fallbackHref="/admin/agents"
        label="Back to Agents"
        className="mb-6"
      />

      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100">
            <h1 className="text-lg font-semibold text-navy-700">
              Edit: {agent.firstName} {agent.lastName}
            </h1>
          </div>
          <div className="px-6 py-5">
            <AgentForm
              mode="edit"
              agentId={agent.id}
              initialData={{
                firstName: agent.firstName,
                lastName: agent.lastName,
                email: agent.email ?? "",
                phone: agent.phone ?? "",
                photoUrl: agent.photoUrl ?? "",
                bio: agent.bio ?? "",
                languages: agent.languages,
                designations: agent.designations,
                active: agent.active,
                emailSignature: agent.emailSignature ?? "",
                emailTagline: agent.emailTagline ?? "",
                brandColor: agent.brandColor ?? "",
              }}
            />
          </div>
        </div>

        <AgentInviteLink
          agentId={agent.id}
          inviteCode={agent.inviteCode}
          inviteExpiresAt={agent.inviteExpiresAt?.toISOString() ?? null}
          inviteUsed={agent.inviteUsed}
          hasLinkedUser={!!agent.userId}
        />
      </div>
    </div>
  );
}
