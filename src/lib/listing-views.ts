import { prisma } from "@/lib/prisma";

export function todayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export async function recordListingView(listingId: string): Promise<void> {
  const date = todayKey();
  await prisma.listingViewDaily.upsert({
    where: { listingId_date: { listingId, date } },
    update: { count: { increment: 1 } },
    create: { listingId, date, count: 1 },
  });
}

export async function viewsSince(listingIds: string[], days: number): Promise<Map<string, number>> {
  if (listingIds.length === 0) return new Map();
  const cutoff = todayKey(new Date(Date.now() - days * 24 * 60 * 60 * 1000));

  const rows = await prisma.listingViewDaily.groupBy({
    by: ["listingId"],
    where: { listingId: { in: listingIds }, date: { gte: cutoff } },
    _sum: { count: true },
  });

  return new Map(rows.map((row) => [row.listingId, row._sum.count ?? 0]));
}
