import { NextRequest, NextResponse } from "next/server";
import { aiCompleteForFeature } from "@/lib/ai";
import { logApiError } from "@/lib/api-error";
import { DistributedRateLimiter } from "@/lib/rate-limit/distributed";
import {
  readJsonBodyWithLimit,
  RequestBodyTooLargeError,
} from "@/lib/http/request-body";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const maxDuration = 60;
const MAX_REQUEST_BYTES = 10_000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 8;
const mortgageAdvisorRateLimiter = new DistributedRateLimiter({
  windowMs: RATE_LIMIT_WINDOW_MS,
  maxBuckets: 10_000,
  namespace: "mortgage-advisor",
});

const mortgageAdvisorSchema = z.object({
  annualIncome: z.number().finite().positive().max(1_000_000_000).optional(),
  monthlyDebt: z.number().finite().min(0).max(100_000_000).optional(),
  downPayment: z.number().finite().min(0).max(1_000_000_000).optional(),
  creditScore: z.enum(["760+", "700-759", "660-699", "620-659", "below 620"]).optional(),
  homePrice: z.number().finite().positive().max(1_000_000_000).optional(),
  description: z.string().trim().max(2000).optional(),
}).strict().refine(
  (data) => data.annualIncome || data.monthlyDebt || data.downPayment || data.creditScore || data.homePrice || data.description,
  { message: "Please provide at least one financial field" },
);

const mortgageAdvisorResponseSchema = z.object({
  scenarios: z.array(z.object({
    name: z.string().min(1).max(100),
    loanType: z.string().min(1).max(200),
    homePrice: z.number().finite().min(0).max(1_000_000_000),
    downPayment: z.number().finite().min(0).max(1_000_000_000),
    downPaymentPct: z.number().finite().min(0).max(100),
    monthlyPayment: z.number().finite().min(0).max(100_000_000),
    loanTerm: z.string().min(1).max(100),
    interestRateEstimate: z.string().min(1).max(100),
    considerations: z.array(z.string().min(1).max(500)).max(10),
  })).min(1).max(3),
  summary: z.string().min(1).max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rateLimit = await mortgageAdvisorRateLimiter.consume([
      { key: `user:${user.id}`, limit: RATE_LIMIT_MAX_REQUESTS },
    ]);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: rateLimit.unavailable
            ? "The mortgage advisor is temporarily unavailable. Please try again later."
            : "Too many requests. Please try again later.",
        },
        {
          status: rateLimit.unavailable ? 503 : 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    let raw: unknown;
    try {
      raw = await readJsonBodyWithLimit(request, MAX_REQUEST_BYTES);
    } catch (error) {
      if (error instanceof RequestBodyTooLargeError) {
        return NextResponse.json({ error: "Request is too large" }, { status: 413 });
      }
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    const input = mortgageAdvisorSchema.safeParse(raw);
    if (!input.success) {
      return NextResponse.json(
        { error: "Validation failed", details: input.error.flatten().fieldErrors },
        { status: 400 },
      );
    }
    const body = input.data;

    const inputs: string[] = [];
    if (body.annualIncome) inputs.push(`Annual income: $${body.annualIncome.toLocaleString()}`);
    if (body.monthlyDebt) inputs.push(`Monthly debt: $${body.monthlyDebt.toLocaleString()}`);
    if (body.downPayment) inputs.push(`Down payment: $${body.downPayment.toLocaleString()}`);
    if (body.creditScore) inputs.push(`Credit score range: ${body.creditScore}`);
    if (body.homePrice) inputs.push(`Target home price: $${body.homePrice.toLocaleString()}`);
    if (body.description) inputs.push(`Additional info: ${body.description}`);

    const prompt = `Based on this financial profile:
${inputs.join("\n")}

Generate 3 mortgage scenarios:
1. **Conservative** - Lower monthly payment, more down, shorter term considerations
2. **Moderate** - Balanced approach with common loan products
3. **Stretch** - Maximum buying power, higher DTI utilization

For each scenario include:
- Loan type (Conventional, FHA, VA if applicable)
- Approximate home price range
- Down payment amount and percentage
- Estimated monthly payment (PITI)
- Loan term
- Key considerations/tradeoffs

Format as JSON with this structure:
{
  "scenarios": [
    {
      "name": "Conservative",
      "loanType": "...",
      "homePrice": number,
      "downPayment": number,
      "downPaymentPct": number,
      "monthlyPayment": number,
      "loanTerm": "30-year fixed",
      "interestRateEstimate": "6.5-7.0%",
      "considerations": ["..."]
    }
  ],
  "summary": "Brief overall assessment"
}`;

    const result = await aiCompleteForFeature("mortgage_advisor", {
      feature: "mortgage_advisor",
      systemPrompt: "You are a mortgage advisor assistant. Provide helpful financing scenarios. Always output valid JSON. Use current average mortgage rates. This is for educational purposes only, not financial advice.",
      userMessage: prompt,
      userId: user.id,
      maxTokens: 2000,
      temperature: 0.5,
    });

    // Try to parse JSON from the response
    let parsed: unknown;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    const validated = mortgageAdvisorResponseSchema.safeParse(parsed);
    if (!validated.success) {
      return NextResponse.json(
        { error: "The advisor returned an invalid response" },
        { status: 502 },
      );
    }

    return NextResponse.json(validated.data);
  } catch (err) {
    logApiError("ai/mortgage-advisor", err);
    return NextResponse.json({ error: "Failed to generate scenarios" }, { status: 500 });
  }
}
