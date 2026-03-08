import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  body: z.string().optional(),
  category: z.string().min(1).optional(),
  audience: z.enum(["agent", "public", "both"]).optional(),
  type: z.enum(["video", "document", "quiz", "article"]).optional(),
  url: z.string().url().optional(),
  fileKey: z.string().optional(),
  duration: z.number().optional(),
  tags: z.array(z.string()).optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const rawBody = await request.json();
  const parsed = updateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid data", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const existing = await prisma.trainingContent.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const updated = await prisma.trainingContent.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const record = await prisma.trainingContent.findUnique({ where: { id } });
  if (!record) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (record.fileKey) {
    const supabase = createAdminClient();
    await supabase.storage.from("training-files").remove([record.fileKey]);
  }

  await prisma.trainingContent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
