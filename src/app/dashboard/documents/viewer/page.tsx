import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { PdfViewerShell } from "./pdf-viewer-shell";
import { resolveDocumentSlug } from "@/lib/slug/resolve";
import type { AgentInfo } from "@/types/document-viewer";

async function getAgentData(userId: string) {
  const profile = await prisma.userProfile.findUnique({
    where: { id: userId },
    select: {
      email: true,
      documentSignatures: {
        select: { id: true, label: true, imageData: true, source: true },
        orderBy: { createdAt: "asc" as const },
      },
      agentProfile: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          designations: true,
        },
      },
    },
  });

  if (!profile) return null;

  const agent = profile.agentProfile
    ?? (profile.email
      ? await prisma.agent.findFirst({
          where: { email: profile.email, active: true },
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            designations: true,
          },
        })
      : null);

  return {
    ...agent,
    savedSignatures: (profile.documentSignatures ?? []).map((s) => ({
      id: s.id,
      label: s.label,
      imageData: s.imageData,
    })),
  };
}

export default async function DocumentViewerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const profile = await prisma.userProfile.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (profile?.role !== "agent" && profile?.role !== "admin") {
    return <AccessDenied />;
  }

  const params = await searchParams;
  const slugParam = typeof params.slug === "string" ? params.slug : undefined;
  const docPath = typeof params.doc === "string" ? params.doc : undefined;

  let documentId: string | null = null;
  let documentSlug: string | null = null;
  let documentName = "Document";
  let fileUrl: string | null = null;

  if (slugParam) {
    const resolved = await resolveDocumentSlug(slugParam);
    if (!resolved) redirect("/dashboard/agent-hub/documents");
    if (resolved.redirectFrom && resolved.record.slug) {
      redirect(`/dashboard/documents/viewer?slug=${resolved.record.slug}`);
    }
    const doc = await prisma.document.findUnique({
      where: { id: resolved.record.id },
    });
    if (!doc || !doc.published) redirect("/dashboard/agent-hub/documents");
    if (doc.external && doc.url) {
      redirect(doc.url);
    }
    documentId = doc.id;
    documentSlug = doc.slug;
    documentName = doc.name;
    fileUrl = `/api/documents/by-slug/${encodeURIComponent(doc.slug)}`;
  } else if (docPath) {
    if (docPath.includes("..") || docPath.startsWith("/")) {
      redirect("/dashboard/agent-hub/documents");
    }
    // Prefer to redirect legacy path URLs to slug URLs when we can match them
    const matched = await prisma.document.findFirst({
      where: { storageKey: docPath },
      select: { slug: true },
    });
    if (matched) {
      redirect(`/dashboard/documents/viewer?slug=${matched.slug}`);
    }
    documentName = docPath.split("/").pop() ?? "Document";
    fileUrl = `/api/documents/${docPath}`;
  } else {
    redirect("/dashboard/agent-hub/documents");
  }

  const agent = await getAgentData(user.id);
  const agentInfo: AgentInfo = {
    firstName: agent?.firstName ?? "",
    lastName: agent?.lastName ?? "",
    email: agent?.email ?? null,
    phone: agent?.phone ?? null,
    brokerageName: "Home Wise Realty Group",
    licenseNumber: agent?.designations?.[0] ?? null,
  };

  const savedSignatures = agent?.savedSignatures ?? [];

  return (
    <PdfViewerShell
      documentPath={docPath ?? documentSlug ?? ""}
      documentId={documentId}
      documentName={documentName}
      fileUrl={fileUrl ?? ""}
      agentInfo={agentInfo}
      savedSignatures={savedSignatures}
    />
  );
}
