import { NextRequest, NextResponse } from "next/server";
import { requireStaffApi, isError } from "@/lib/admin-api";
import { logApiError } from "@/lib/api-error";
import { checkFeatureAccess } from "@/lib/billing/check-feature";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { renderToBuffer, type DocumentProps } from "@react-pdf/renderer";
import { CmaReportDocument } from "@/components/pdf/cma-report-document";
import { createElement, type ReactElement } from "react";
import type { CmaReportProps } from "@/components/pdf/cma-report-document";
import { z } from "zod";

export const maxDuration = 60;
export const MAX_CMA_PDF_BODY_BYTES = 64 * 1024;

const boundedText = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const boundedNumber = (max: number) => z.number().finite().min(0).max(max);

const estimatedValueSchema = z.object({
  low: boundedNumber(1_000_000_000),
  mid: boundedNumber(1_000_000_000),
  high: boundedNumber(1_000_000_000),
}).strict().superRefine((value, context) => {
  if (value.low > value.mid || value.mid > value.high) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Estimated values must be in ascending order",
    });
  }
});

const subjectPropertySchema = z.object({
  address: boundedText(300),
  city: boundedText(100),
  zip: boundedText(20),
  beds: boundedNumber(30).optional(),
  baths: boundedNumber(30).optional(),
  sqft: boundedNumber(1_000_000).optional(),
  propertyType: boundedText(100).optional(),
}).strict();

const compSchema = z.object({
  address: boundedText(300),
  city: boundedText(100),
  soldPrice: boundedNumber(1_000_000_000),
  beds: boundedNumber(30),
  baths: boundedNumber(30),
  sqft: boundedNumber(1_000_000),
  dom: boundedNumber(10_000),
  closeDate: z.string().max(50).datetime().nullable(),
}).strict();

const activeCompSchema = z.object({
  address: boundedText(300),
  price: boundedNumber(1_000_000_000),
  beds: boundedNumber(30),
  baths: boundedNumber(30),
  sqft: boundedNumber(1_000_000),
  dom: boundedNumber(10_000),
}).strict();

export const cmaPdfSchema = z.object({
  estimatedValue: estimatedValueSchema.optional(),
  pricingRecommendation: boundedText(2_000).optional(),
  marketNarrative: boundedText(10_000).optional(),
  keyFindings: z.array(boundedText(1_000)).max(20).optional(),
  comps: z.array(compSchema).max(25),
  activeComps: z.array(activeCompSchema).max(10).optional(),
  subjectProperty: subjectPropertySchema,
  agentName: boundedText(200).optional(),
  agentEmail: z.string().trim().email().max(320).optional(),
  agentPhone: boundedText(50).optional(),
}).strict();

export async function POST(request: NextRequest) {
  const auth = await requireStaffApi();
  if (isError(auth)) return auth.error;

  if (!auth.isAdmin) {
    if (!auth.agentId) {
      return NextResponse.json({ error: "Agent profile not linked" }, { status: 403 });
    }

    try {
      const entitlement = await checkFeatureAccess(auth.agentId, "ai_cma_reports");
      if (!entitlement.allowed) {
        return NextResponse.json(
          {
            error: "This feature is not available with the current subscription.",
            upgradeBundle: entitlement.upgradeBundle,
          },
          { status: 403 },
        );
      }
    } catch (error) {
      logApiError("ai/cma/pdf/entitlement", error);
      return NextResponse.json({ error: "Failed to generate CMA PDF" }, { status: 500 });
    }
  }

  let body: unknown;
  try {
    body = await readJsonBodyWithLimit(request, MAX_CMA_PDF_BODY_BYTES);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
    }

    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = cmaPdfSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }

  const cma = parsed.data;
  const agentName = `${auth.profile.firstName} ${auth.profile.lastName}`.trim();
  const props: CmaReportProps = {
    estimatedValue: cma.estimatedValue,
    pricingRecommendation: cma.pricingRecommendation,
    marketNarrative: cma.marketNarrative,
    keyFindings: cma.keyFindings,
    comps: cma.comps,
    activeComps: cma.activeComps,
    subjectProperty: cma.subjectProperty,
    agentName,
    agentEmail: auth.profile.email,
    agentPhone: auth.profile.phone ?? undefined,
  };

  try {
    const buffer = await renderToBuffer(
      createElement(CmaReportDocument, props) as ReactElement<DocumentProps>,
    );

    const slug = cma.subjectProperty.address
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase()
      .slice(0, 60);

    return new NextResponse(buffer as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="cma-${slug}.pdf"`,
      },
    });
  } catch (error) {
    logApiError("ai/cma/pdf/render", error);
    return NextResponse.json({ error: "Failed to generate CMA PDF" }, { status: 500 });
  }
}
