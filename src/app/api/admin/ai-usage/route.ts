import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi, isError } from "@/lib/admin-api";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireAdminApi();
  if (isError(auth)) return auth.error;

  const url = new URL(req.url);
  const days = Number(url.searchParams.get("days") ?? "30");
  const since = new Date(Date.now() - days * 86400000);

  const [logs, dailyRaw, featureRaw] = await Promise.all([
    prisma.aiUsageLog.aggregate({
      where: { createdAt: { gte: since } },
      _sum: { inputTokens: true, outputTokens: true, latencyMs: true },
      _count: true,
      _avg: { latencyMs: true },
    }),
    prisma.$queryRaw<{ day: string; calls: bigint; tokens: bigint }[]>`
      SELECT DATE("createdAt") as day,
             COUNT(*) as calls,
             SUM("inputTokens" + "outputTokens") as tokens
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${since}
      GROUP BY DATE("createdAt")
      ORDER BY day ASC
    `,
    prisma.$queryRaw<{ feature: string; calls: bigint; tokens: bigint; avg_latency: number }[]>`
      SELECT feature,
             COUNT(*) as calls,
             SUM("inputTokens" + "outputTokens") as tokens,
             AVG("latencyMs")::float as avg_latency
      FROM "AiUsageLog"
      WHERE "createdAt" >= ${since}
      GROUP BY feature
      ORDER BY calls DESC
    `,
  ]);

  const daily = dailyRaw.map((d) => ({
    day: String(d.day),
    calls: Number(d.calls),
    tokens: Number(d.tokens),
  }));

  const byFeature = featureRaw.map((f) => ({
    feature: f.feature,
    calls: Number(f.calls),
    tokens: Number(f.tokens),
    avgLatency: Math.round(f.avg_latency),
  }));

  const totalTokens = (logs._sum.inputTokens ?? 0) + (logs._sum.outputTokens ?? 0);
  // Rough cost estimate: ~$3 per 1M input, ~$15 per 1M output for Claude Sonnet
  const estimatedCost =
    ((logs._sum.inputTokens ?? 0) / 1_000_000) * 3 +
    ((logs._sum.outputTokens ?? 0) / 1_000_000) * 15;

  return NextResponse.json({
    totalCalls: logs._count,
    totalTokens,
    inputTokens: logs._sum.inputTokens ?? 0,
    outputTokens: logs._sum.outputTokens ?? 0,
    avgLatencyMs: Math.round(logs._avg.latencyMs ?? 0),
    estimatedCost: Math.round(estimatedCost * 100) / 100,
    daily,
    byFeature,
  });
}
