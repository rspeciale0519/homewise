import { NextRequest, NextResponse } from "next/server";
import { propertyFilterSchema } from "@/schemas/property-filter.schema";
import { propertyProvider } from "@/providers/mock-property-provider";

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());

  const parsed = propertyFilterSchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filters", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const result = await propertyProvider.search(parsed.data);

  return NextResponse.json(result);
}
