import { NextRequest, NextResponse } from "next/server";
import { agentFilterSchema } from "@/schemas/agent-filter.schema";
import { filterAgents } from "@/data/mock/agents";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const parsed = agentFilterSchema.safeParse({
    language: searchParams.get("language") ?? undefined,
    letter: searchParams.get("letter") ?? undefined,
    search: searchParams.get("search") ?? undefined,
    page: searchParams.get("page") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid filter parameters", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { language, letter, search, page } = parsed.data;

  const result = filterAgents({
    language,
    letter,
    search,
    page,
    perPage: 12,
  });

  return NextResponse.json({
    agents: result.agents,
    total: result.total,
    totalPages: result.totalPages,
    currentPage: page,
  });
}
