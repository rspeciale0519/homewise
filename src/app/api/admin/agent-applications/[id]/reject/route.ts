import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { agentApplicationRejectedEmail } from "@/lib/email/templates";
import { applicationReviewSchema } from "@/schemas/agent-application.schema";

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

    const claimed = await prisma.agentApplication.updateMany({
      where: { id, status: "pending" },
      data: {
        status: "rejected",
        reviewedBy: auth.profile.id,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });
    if (claimed.count !== 1) {
      return NextResponse.json(
        { error: "Application has already been reviewed" },
        { status: 409 },
      );
    }

    try {
      const template = agentApplicationRejectedEmail(application.firstName, notes);
      await sendEmail({
        to: application.email,
        subject: template.subject,
        html: template.html,
      });
    } catch (err) {
      console.error("[agent-application] rejection email failed:", err);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
