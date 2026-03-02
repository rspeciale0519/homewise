import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";
import { adminSubmissionStatusSchema } from "@/schemas/admin-submission.schema";

type SubmissionType = "contact" | "evaluation" | "buyer";

const VALID_TYPES = new Set<string>(["contact", "evaluation", "buyer"]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { type, id } = await params;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid submission type" }, { status: 400 });
  }

  try {
    const submission = await findSubmission(type as SubmissionType, id);

    if (!submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    return NextResponse.json({ submission, type });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ type: string; id: string }> }
) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const { type, id } = await params;

  if (!VALID_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid submission type" }, { status: 400 });
  }

  const body: unknown = await request.json();
  const parsed = adminSubmissionStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const updated = await updateSubmissionStatus(type as SubmissionType, id, parsed.data.status);
    return NextResponse.json({ submission: updated });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

async function findSubmission(type: SubmissionType, id: string) {
  switch (type) {
    case "contact":
      return prisma.contactSubmission.findUnique({ where: { id } });
    case "evaluation":
      return prisma.homeEvaluation.findUnique({ where: { id } });
    case "buyer":
      return prisma.buyerRequest.findUnique({ where: { id } });
  }
}

async function updateSubmissionStatus(type: SubmissionType, id: string, status: string) {
  switch (type) {
    case "contact":
      return prisma.contactSubmission.update({ where: { id }, data: { status } });
    case "evaluation":
      return prisma.homeEvaluation.update({ where: { id }, data: { status } });
    case "buyer":
      return prisma.buyerRequest.update({ where: { id }, data: { status } });
  }
}
