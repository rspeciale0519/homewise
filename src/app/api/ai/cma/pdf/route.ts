import { NextRequest, NextResponse } from "next/server";
import { requireAuthApi, isError } from "@/lib/admin-api";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { CmaReportDocument } from "@/components/pdf/cma-report-document";
import { createElement, type ReactElement } from "react";
import type { CmaReportProps } from "@/components/pdf/cma-report-document";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const auth = await requireAuthApi();
  if (isError(auth)) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const cma = body as CmaReportProps;

  const agentName = `${auth.profile.firstName} ${auth.profile.lastName}`.trim();
  const props: CmaReportProps = {
    ...cma,
    agentName,
    agentEmail: auth.profile.email,
    agentPhone: auth.profile.phone ?? undefined,
  };

  const buffer = await renderToBuffer(createElement(CmaReportDocument, props) as ReactElement<DocumentProps>);

  const rawAddress = cma.subjectProperty?.address ?? "property";
  const slug = rawAddress.replace(/[^a-z0-9]/gi, "-").toLowerCase().slice(0, 60);

  return new NextResponse(buffer as unknown as ReadableStream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="cma-${slug}.pdf"`,
    },
  });
}
