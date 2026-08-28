import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  emailActionMatchesRecipient,
  EmailActionTokenError,
  type UnsubscribeAction,
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
    { error: "This unsubscribe link is invalid." },
    { status: 400, headers: PRIVATE_HEADERS },
  );
}

function successResponse() {
  return NextResponse.json({ success: true }, { headers: PRIVATE_HEADERS });
}

async function applyUnsubscribe(action: UnsubscribeAction): Promise<"updated" | "missing" | "mismatch"> {
  switch (action.target.kind) {
    case "property_alert": {
      const alert = await prisma.propertyAlert.findUnique({
        where: { id: action.target.id },
        select: { email: true },
      });
      if (!alert) return "missing";
      if (!emailActionMatchesRecipient(action, alert.email)) return "mismatch";
      await prisma.propertyAlert.updateMany({
        where: { id: action.target.id, email: alert.email },
        data: { active: false },
      });
      return "updated";
    }
    case "saved_search": {
      const search = await prisma.savedSearch.findUnique({
        where: { id: action.target.id },
        select: { userId: true, user: { select: { email: true } } },
      });
      if (!search) return "missing";
      if (!emailActionMatchesRecipient(action, search.user.email)) return "mismatch";
      await prisma.savedSearch.updateMany({
        where: { id: action.target.id, userId: search.userId },
        data: { alertEnabled: false },
      });
      return "updated";
    }
    case "contact": {
      const contact = await prisma.contact.findUnique({
        where: { id: action.target.id },
        select: { email: true },
      });
      if (!contact) return "missing";
      if (!emailActionMatchesRecipient(action, contact.email)) return "mismatch";
      await prisma.$transaction([
        prisma.contact.updateMany({
          where: { id: action.target.id, email: contact.email },
          data: { marketingEmailOptOutAt: new Date() },
        }),
        prisma.campaignEnrollment.updateMany({
          where: { contactId: action.target.id, status: "active" },
          data: { status: "unsubscribed", nextSendAt: null },
        }),
      ]);
      return "updated";
    }
    case "user": {
      const user = await prisma.userProfile.findUnique({
        where: { id: action.target.id },
        select: { email: true },
      });
      if (!user) return "missing";
      if (!emailActionMatchesRecipient(action, user.email)) return "mismatch";
      await prisma.userProfile.updateMany({
        where: { id: action.target.id, email: user.email },
        data: { favoritePriceAlertsEnabled: false },
      });
      return "updated";
    }
  }
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
    const ipRule = clientIpRateRule(request, "email-unsubscribe", 120);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `email-unsubscribe:token:${tokenHash}`, limit: 20 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The unsubscribe service is temporarily unavailable. Please try again later."
            : "Too many requests. Please try again later.",
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

    const action = verifyEmailActionToken(parsed.data.token, "unsubscribe");
    const result = await applyUnsubscribe(action);
    if (result === "mismatch") return invalidLinkResponse();
    return successResponse();
  } catch (error) {
    if (error instanceof EmailActionTokenError) return invalidLinkResponse();
    console.error("[email-unsubscribe] request failed", error);
    return NextResponse.json(
      { error: "The unsubscribe service is unavailable." },
      { status: 500, headers: PRIVATE_HEADERS },
    );
  }
}
