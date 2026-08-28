import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { createAgentRecord } from "@/lib/agents";
import { generateInviteCode, getInviteExpiryDate } from "@/lib/invite-codes";
import { sendEmail } from "@/lib/email";
import { agentApplicationApprovedEmail } from "@/lib/email/templates";
import { applicationReviewSchema } from "@/schemas/agent-application.schema";
import { SITE_URL } from "@/lib/constants";

class ApplicationReviewConflictError extends Error {}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { id } = await params;

  try {
    const body: unknown = await request.json().catch(() => ({}));
    const parsed = applicationReviewSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const notes = parsed.data.notes;

    const application = await prisma.agentApplication.findUnique({ where: { id } });
    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }
    if (application.status !== "pending") {
      return NextResponse.json(
        { error: `Application already ${application.status}` },
        { status: 409 }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const claimed = await tx.agentApplication.updateMany({
        where: { id, status: "pending" },
        data: {
          status: "approved",
          reviewedBy: auth.profile.id,
          reviewedAt: new Date(),
          reviewNotes: notes || null,
        },
      });
      if (claimed.count !== 1) throw new ApplicationReviewConflictError();

      const agent = await createAgentRecord(
        {
          firstName: application.firstName,
          lastName: application.lastName,
          email: application.email,
          phone: application.phone,
          mlsAgentId: application.mlsAgentId,
          active: true,
        },
        tx
      );

      const inviteCode = generateInviteCode();
      await tx.agent.update({
        where: { id: agent.id },
        data: {
          inviteCode,
          inviteExpiresAt: getInviteExpiryDate(),
          inviteUsed: false,
        },
      });

      await tx.agentApplication.update({
        where: { id },
        data: {
          agentId: agent.id,
        },
      });

      return { agentId: agent.id, inviteCode };
    });

    revalidatePath("/agents");

    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? SITE_URL).replace(/\/$/, "");
    const inviteUrl = `${baseUrl}/register?invite=${result.inviteCode}`;
    let emailWarning: string | null = null;
    try {
      const template = agentApplicationApprovedEmail(application.firstName, inviteUrl);
      const sent = await sendEmail({
        to: application.email,
        subject: template.subject,
        html: template.html,
      });
      if (sent.error) {
        emailWarning = "Email delivery failed — share the invite link manually.";
      }
    } catch (err) {
      console.error("[agent-application] approval email failed:", err);
      emailWarning = "Email delivery failed — share the invite link manually.";
    }

    return NextResponse.json(
      { success: true, agentId: result.agentId, inviteUrl, emailWarning },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApplicationReviewConflictError) {
      return NextResponse.json(
        { error: "Application has already been reviewed" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
