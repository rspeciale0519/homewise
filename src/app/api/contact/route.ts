import { NextRequest, NextResponse } from "next/server";
import { contactSchema } from "@/schemas/contact.schema";
import { prisma } from "@/lib/prisma";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await readJsonBodyWithLimit(request, 5_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const ipRule = clientIpRateRule(request, "contact", 30);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `contact:email:${parsed.data.email}`, limit: 5 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The contact service is temporarily unavailable. Please try again later."
            : "Too many messages. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const submission = await prisma.contactSubmission.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        message: parsed.data.message,
      },
    });

    return NextResponse.json(
      { success: true, id: submission.id },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
