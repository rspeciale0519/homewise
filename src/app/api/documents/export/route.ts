import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import path from "path";
import { exportSchema } from "@/schemas/document-viewer.schema";
import { mergePdfWithAnnotations } from "@/lib/documents/pdf-merger";
import { sendEmail, buildEmailHtml } from "@/lib/email";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = exportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { documentPath, annotations, action } = parsed.data;

  if (documentPath.includes("..") || documentPath.startsWith("/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const documentsDir = path.join(process.cwd(), "private", "documents");
  const fullPath = path.resolve(documentsDir, documentPath);

  if (!fullPath.startsWith(documentsDir)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await readFile(fullPath);
  } catch {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const mergedPdf = await mergePdfWithAnnotations(pdfBuffer, annotations);
  const fileName = path.basename(documentPath, ".pdf") + "-filled.pdf";

  if (action === "download") {
    return new NextResponse(Buffer.from(mergedPdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  }

  if (action === "email") {
    const { emailTo, emailSubject, emailMessage } = parsed.data;

    if (!emailTo) {
      return NextResponse.json({ error: "Email recipient is required" }, { status: 400 });
    }

    const htmlBody = buildEmailHtml(
      `<p>${emailMessage ?? "Please find the attached document."}</p>`
    );

    const result = await sendEmail({
      to: emailTo,
      subject: emailSubject ?? `Document: ${fileName}`,
      html: htmlBody,
      attachments: [
        {
          filename: fileName,
          content: Buffer.from(mergedPdf),
        },
      ],
    });

    if (result.error) {
      return NextResponse.json(
        { error: `Failed to send email: ${result.error}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, messageId: result.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
