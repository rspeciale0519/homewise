import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isError, requireAuthApi } from "@/lib/admin-api";
import {
  completeTrainingContent,
  reopenTrainingContent,
} from "@/lib/training/completion";

const contentIdSchema = z.string().trim().min(1).max(100);

async function authorize(params: Promise<{ id: string }>) {
  const auth = await requireAuthApi();
  if (isError(auth)) return { error: auth.error } as const;
  if (auth.profile.role !== "agent") {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  const contentId = contentIdSchema.safeParse((await params).id);
  if (!contentId.success) {
    return {
      error: NextResponse.json({ error: "Invalid content ID" }, { status: 400 }),
    } as const;
  }

  return { userId: auth.user.id, contentId: contentId.data } as const;
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(params);
  if ("error" in access) return access.error;

  const completed = await completeTrainingContent(
    access.userId,
    access.contentId,
  );
  return completed
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Training content not found" }, { status: 404 });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const access = await authorize(params);
  if ("error" in access) return access.error;

  const reopened = await reopenTrainingContent(
    access.userId,
    access.contentId,
  );
  return reopened
    ? NextResponse.json({ success: true })
    : NextResponse.json({ error: "Training content not found" }, { status: 404 });
}
