import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  emailActionMatchesRecipient,
  EmailActionTokenError,
  verifyEmailActionToken,
} from "@/lib/email/action-token";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";

const requestSchema = z.object({
  token: z.string().min(1).max(2_048),
}).strict();

const PRIVATE_HEADERS = {
  "Cache-Control": "no-store",
  "Referrer-Policy": "no-referrer",
};

function invalidLinkResponse() {
  return NextResponse.json(
    { error: "This confirmation link is invalid, expired, or already used." },
    { status: 400, headers: PRIVATE_HEADERS },
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await readJsonBodyWithLimit(request, 3_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json(
          { error: "Request is too large" },
          { status: 413, headers: PRIVATE_HEADERS },
        );
      }
      return invalidLinkResponse();
    }

    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) return invalidLinkResponse();

    const tokenHash = createHash("sha256").update(parsed.data.token).digest("hex");
    const ipRule = clientIpRateRule(request, "property-alert-confirm", 60);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `property-alert-confirm:token:${tokenHash}`, limit: 10 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The confirmation service is temporarily unavailable. Please try again later."
            : "Too many confirmation requests. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: {
            ...PRIVATE_HEADERS,
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const action = verifyEmailActionToken(
      parsed.data.token,
      "property_alert_confirmation",
    );
    const alert = await prisma.propertyAlert.findUnique({
      where: { id: action.subjectId },
      select: {
        email: true,
        verificationRequired: true,
        verificationVersion: true,
      },
    });
    if (
      !alert
      || !alert.verificationRequired
      || alert.verificationVersion !== action.verificationVersion
      || !emailActionMatchesRecipient(action, alert.email)
    ) {
      return invalidLinkResponse();
    }

    const activated = await prisma.propertyAlert.updateMany({
      where: {
        id: action.subjectId,
        active: false,
        verificationRequired: true,
        verificationVersion: action.verificationVersion,
      },
      data: {
        active: true,
        verificationRequired: false,
        emailVerifiedAt: new Date(),
        verificationVersion: { increment: 1 },
      },
    });
    if (activated.count !== 1) return invalidLinkResponse();

    return NextResponse.json(
      { success: true },
      { headers: PRIVATE_HEADERS },
    );
  } catch (error) {
    if (error instanceof EmailActionTokenError) return invalidLinkResponse();
    console.error("[property-alert-confirm] request failed", error);
    return NextResponse.json(
      { error: "The confirmation service is unavailable." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
