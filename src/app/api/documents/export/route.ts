import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { readFile, stat } from "fs/promises";
import path from "path";
import { exportSchema } from "@/schemas/document-viewer.schema";
import { mergePdfWithAnnotations } from "@/lib/documents/pdf-merger";
import { sendEmail, buildEmailHtml } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";
import { DistributedRateLimiter } from "@/lib/rate-limit/distributed";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import {
  resolveContainedPath,
  resolveRealContainedPath,
} from "@/lib/documents/safe-path";

export const maxDuration = 60;

const MAX_EXPORT_REQUEST_BYTES = 12_000_000;
const MAX_PDF_BYTES = 25_000_000;
const documentExportRateLimiter = new DistributedRateLimiter({
  windowMs: 60_000,
  maxBuckets: 10_000,
  namespace: "document-export",
});
const documentEmailRateLimiter = new DistributedRateLimiter({
  windowMs: 10 * 60_000,
  maxBuckets: 10_000,
  namespace: "document-email",
});

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    };
    return entities[character] ?? character;
  });
}

function safeAttachmentName(name: string): string {
  const baseName = path.basename(name, path.extname(name));
  const sanitized = baseName.replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
  return `${sanitized.slice(0, 150) || "document"}-filled.pdf`;
}

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

  const exportLimit = await documentExportRateLimiter.consume([
    { key: `user:${user.id}`, limit: 20 },
  ]);
  if (!exportLimit.allowed) {
    return NextResponse.json(
      {
        error: exportLimit.unavailable
          ? "The export service is temporarily unavailable. Please try again later."
          : "Too many export requests. Please try again later.",
      },
      {
        status: exportLimit.unavailable ? 503 : 429,
        headers: { "Retry-After": String(exportLimit.retryAfterSeconds) },
      },
    );
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, MAX_EXPORT_REQUEST_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request is too large" }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = exportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { documentPath, annotations, formValues, flatten, action } = parsed.data;

  if (action === "email") {
    const emailLimit = await documentEmailRateLimiter.consume([
      { key: `user:${user.id}`, limit: 5 },
    ]);
    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          error: emailLimit.unavailable
            ? "The document email service is temporarily unavailable. Please try again later."
            : "Too many document emails. Please try again later.",
        },
        {
          status: emailLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(emailLimit.retryAfterSeconds) },
        },
      );
    }
  }

  const document = await prisma.document.findFirst({
    where: {
      external: false,
      published: true,
      platforms: { has: "homewise" },
      OR: [{ slug: documentPath }, { storageKey: documentPath }],
    },
    select: {
      name: true,
      storageKey: true,
      storageProvider: true,
      mimeType: true,
    },
  });

  if (!document?.storageKey) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  if (
    document.mimeType !== "application/pdf" &&
    path.extname(document.storageKey).toLowerCase() !== ".pdf"
  ) {
    return NextResponse.json({ error: "Only PDF documents can be exported" }, { status: 400 });
  }

  let pdfBuffer: Buffer;
  if (document.storageProvider === "supabase") {
    const { data, error } = await createAdminClient().storage
      .from("documents")
      .download(document.storageKey);
    if (error || !data) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    if (data.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: "Document is too large" }, { status: 413 });
    }
    pdfBuffer = Buffer.from(await data.arrayBuffer());
  } else {
    const documentsDir = path.join(process.cwd(), "private", "documents");
    const fullPath = resolveContainedPath(documentsDir, document.storageKey);
    if (!fullPath) {
      return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
    }

    try {
      const realPath = await resolveRealContainedPath(documentsDir, fullPath);
      if (!realPath) {
        return NextResponse.json({ error: "Invalid document path" }, { status: 400 });
      }
      const fileStats = await stat(realPath);
      if (fileStats.size > MAX_PDF_BYTES) {
        return NextResponse.json({ error: "Document is too large" }, { status: 413 });
      }
      pdfBuffer = await readFile(realPath);
    } catch {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
  }

  let mergedPdf: Uint8Array;
  try {
    mergedPdf = await mergePdfWithAnnotations(
      pdfBuffer,
      annotations,
      formValues,
      flatten,
    );
  } catch (error) {
    console.error("[documents/export] PDF processing failed", error);
    return NextResponse.json({ error: "Could not process document" }, { status: 422 });
  }
  const fileName = safeAttachmentName(document.name);

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

    const safeMessage = escapeHtml(
      emailMessage ?? "Please find the attached document.",
    ).replace(/\r?\n/g, "<br>");
    const htmlBody = buildEmailHtml(`<p>${safeMessage}</p>`, undefined, false);

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
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
    }

    return NextResponse.json({ success: true, messageId: result.id });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
