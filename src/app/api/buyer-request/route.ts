import { NextRequest, NextResponse } from "next/server";
import { buyerRequestSchema } from "@/schemas/buyer-request.schema";
import { prisma } from "@/lib/prisma";
import { readJsonBodyWithLimit, RequestBodyTooLargeError } from "@/lib/http/request-body";
import { clientIpRateRule, publicMutationRateLimiter } from "@/lib/public-rate-limit";

export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await readJsonBodyWithLimit(request, 8_000);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const parsed = buyerRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const ipRule = clientIpRateRule(request, "buyer-request", 30);
    const rateLimit = await publicMutationRateLimiter.consume([
      ...(ipRule ? [ipRule] : []),
      { key: `buyer-request:email:${parsed.data.email}`, limit: 5 },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The request service is temporarily unavailable. Please try again later."
            : "Too many requests. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    await prisma.buyerRequest.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        areasOfInterest: parsed.data.areasOfInterest || null,
        minPrice: parsed.data.minPrice ?? null,
        maxPrice: parsed.data.maxPrice ?? null,
        beds: parsed.data.beds ?? null,
        baths: parsed.data.baths ?? null,
        propertyTypes: parsed.data.propertyTypes ?? [],
        timeline: parsed.data.timeline || null,
        comments: parsed.data.comments || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
