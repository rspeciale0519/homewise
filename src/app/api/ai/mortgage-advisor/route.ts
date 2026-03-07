import { NextRequest, NextResponse } from "next/server";
import { aiComplete } from "@/lib/ai";
import { z } from "zod";

export const maxDuration = 60;

const mortgageAdvisorSchema = z.object({
  annualIncome: z.number().positive().optional(),
  monthlyDebt: z.number().min(0).optional(),
  downPayment: z.number().min(0).optional(),
  creditScore: z.string().optional(),
  homePrice: z.number().positive().optional(),
  description: z.string().max(2000).optional(),
  userId: z.string().optional(),
}).refine(
  (data) => data.annualIncome || data.monthlyDebt || data.downPayment || data.creditScore || data.homePrice || data.description,
  { message: "Please provide at least one financial field" },
);

export async function POST(request: NextRequest) {
  try {
    const raw: unknown = await request.json();
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

    const result = await aiComplete({
      feature: "mortgage_advisor",
      systemPrompt: "You are a mortgage advisor assistant. Provide helpful financing scenarios. Always output valid JSON. Use current average mortgage rates. This is for educational purposes only, not financial advice.",
      userMessage: prompt,
      userId: body.userId,
      maxTokens: 2000,
      temperature: 0.5,
    });

    // Try to parse JSON from the response
    let parsed: unknown;
    try {
      const jsonMatch = result.content.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { raw: result.content };
    } catch {
      parsed = { raw: result.content };
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("[ai/mortgage-advisor] error:", err);
    return NextResponse.json({ error: "Failed to generate scenarios" }, { status: 500 });
  }
}
