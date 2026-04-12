import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AccessDenied } from "@/components/dashboard/access-denied";
import { PdfViewerShell } from "./pdf-viewer-shell";
import {
  OFFICE_FORMS,
  LISTING_FORMS,
  SALES_FORMS,
  QUICK_ACCESS_DOCUMENTS,
} from "@/data/content/agent-resources";
import type { ResourceDocument } from "@/data/content/agent-resources";
import type { AgentInfo } from "@/types/document-viewer";

function findDocumentByPath(docPath: string): ResourceDocument | undefined {
  const apiUrl = `/api/documents/${docPath}`;
  const allDocs = [
    ...QUICK_ACCESS_DOCUMENTS,
    ...OFFICE_FORMS.flatMap((c) => c.documents),
    ...LISTING_FORMS.flatMap((c) => c.documents),
    ...SALES_FORMS.flatMap((c) => c.documents),
  ];
  return allDocs.find((d) => d.url === apiUrl);
}

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
  const docPath =
    typeof params.doc === "string" ? params.doc : undefined;

  if (!docPath) {
    redirect("/dashboard/agent-hub/documents");
  }

  if (docPath.includes("..") || docPath.startsWith("/")) {
    redirect("/dashboard/agent-hub/documents");
  }

  const docMeta = findDocumentByPath(docPath);
  const documentName = docMeta?.name ?? docPath.split("/").pop() ?? "Document";
  const fileUrl = `/api/documents/${docPath}`;

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
      documentPath={docPath}
      documentName={documentName}
      fileUrl={fileUrl}
      agentInfo={agentInfo}
      savedSignatures={savedSignatures}
    />
  );
}
