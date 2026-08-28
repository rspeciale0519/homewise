import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  artworkUploadAttemptKeyFor,
  downloadObjectWithinLimit,
  extFromMime,
  isSubmittedFileKeyForOrder,
  listUploadAttemptKeyFor,
  removeOrderFiles,
  uploadCreateOnlyAtKey,
} from "@/lib/direct-mail/storage";
import {
  MAX_ARTWORK_BYTES,
  MAX_LIST_BYTES,
} from "@/lib/direct-mail/constants";
import {
  artworkFilesArraySchema,
  listFilesArraySchema,
} from "@/lib/direct-mail/schemas";
import type { ArtworkFile, ListFile } from "@/lib/direct-mail/types";
import { logApiError } from "@/lib/api-error";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";

const duplicateRequestSchema = z.object({
  includeList: z.boolean().optional(),
}).strict();

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { id: true, role: true },
  });
  if (!profile || (profile.role !== "agent" && profile.role !== "admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown = {};
  if (req.body) {
    try {
      body = await readJsonBodyWithLimit(req, 1_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
  }
  const parsedBody = duplicateRequestSchema.safeParse(body);
  if (!parsedBody.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const includeList = parsedBody.data.includeList === true;

  const source = await prisma.mailOrder.findUnique({ where: { id } });
  if (!source || source.userId !== profile.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (source.status !== "submitted" || source.purgedAt) {
    return NextResponse.json(
      { error: "Only retained submitted orders can be duplicated" },
      { status: 409 },
    );
  }

  const parsedArtwork = artworkFilesArraySchema.safeParse(source.artworkFiles);
  const parsedLists = includeList
    ? listFilesArraySchema.safeParse(source.listFiles)
    : null;
  if (!parsedArtwork.success || (parsedLists && !parsedLists.success)) {
    return NextResponse.json(
      { error: "The source order files are not valid" },
      { status: 409 },
    );
  }

  const draft = await prisma.mailOrder.create({
    data: {
      userId: profile.id,
      status: "draft",
      currentStep: 1,
      workflow: source.workflow,
      subjectPropertyAddress: source.subjectPropertyAddress,
      campaignName: source.campaignName,
      productType: source.productType,
      productSize: source.productSize,
      mailClass: source.mailClass,
      dropDate: null,
      returnAddress: source.returnAddress ?? undefined,
      quantity: parsedLists?.success
        ? parsedLists.data.reduce((sum, file) => sum + file.rowCount, 0)
        : 0,
      specialInstructions: source.specialInstructions,
      complianceConfirmed: false,
    },
    select: { id: true },
  });

  try {
    const newArtwork: ArtworkFile[] = [];
    for (const file of parsedArtwork.data) {
      if (!isSubmittedFileKeyForOrder(file.fileKey, source.id)) {
        throw new Error("Source artwork key is outside the order prefix");
      }
      const newId = nanoid(12);
      const uploaded = await downloadObjectWithinLimit(
        file.fileKey,
        MAX_ARTWORK_BYTES,
        file.byteSize,
      );
      const ext = extFromMime(file.mimeType);
      const newKey = artworkUploadAttemptKeyFor(
        draft.id,
        newId,
        uploaded.byteSize,
        ext,
      );
      await uploadCreateOnlyAtKey(newKey, {
        buffer: uploaded.buffer,
        mimeType: file.mimeType,
      });
      newArtwork.push({
        id: newId,
        name: file.name,
        fileKey: newKey,
        fileName: file.fileName,
        byteSize: uploaded.byteSize,
        mimeType: file.mimeType,
        warnings: file.warnings,
      });
    }

    const newLists: ListFile[] = [];
    if (parsedLists?.success) {
      for (const file of parsedLists.data) {
        if (!isSubmittedFileKeyForOrder(file.fileKey, source.id)) {
          throw new Error("Source list key is outside the order prefix");
        }
        const newId = nanoid(12);
        const uploaded = await downloadObjectWithinLimit(
          file.fileKey,
          MAX_LIST_BYTES,
          file.byteSize,
        );
        const newKey = listUploadAttemptKeyFor(draft.id, newId, uploaded.byteSize);
        await uploadCreateOnlyAtKey(newKey, {
          buffer: uploaded.buffer,
          mimeType: "text/csv",
        });
        newLists.push({
          ...file,
          id: newId,
          fileKey: newKey,
          byteSize: uploaded.byteSize,
        });
      }
    }

    await prisma.mailOrder.update({
      where: { id: draft.id },
      data: {
        artworkFiles: newArtwork as unknown as object,
        listFiles: newLists as unknown as object,
      },
    });
  } catch (error) {
    try {
      await removeOrderFiles(draft.id);
      await prisma.mailOrder.deleteMany({
        where: { id: draft.id, userId: profile.id, status: "draft" },
      });
    } catch (cleanupError) {
      logApiError("direct-mail/duplicate-cleanup", cleanupError);
    }
    logApiError("direct-mail/duplicate", error);
    return NextResponse.json({ error: "Failed to duplicate the order" }, { status: 502 });
  }

  return NextResponse.json({ orderId: draft.id });
}
