/**
 * One-time backfill: re-stamp mlgCanUse on existing listings from the Broker
 * Back Office (BBO) dataset, which returns the full permission set
 * (["BO","IDX","VOW"]) per record. The IDX-token backfill stored only ["IDX"],
 * so withBo() analytics matched nothing. This pages the BBO Property feed
 * (no media expand — avoids photo re-signing churn) and updates mlgCanUse +
 * close/sold fields on rows we already hold. It never creates or deletes rows.
 */
import { prisma } from "../src/lib/prisma";

const BASE = process.env.MLS_GRID_BASE_URL ?? "https://api-demo.mlsgrid.com/v2";
const OSN = process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME ?? "mfrmls";
const TOKEN = process.env.MLS_GRID_BO_TOKEN ?? process.env.BBO_ACCESS_TOKEN ?? "";

type ResoRow = {
  ListingKey: string;
  MlgCanUse?: string[];
  StandardStatus?: string;
  ClosePrice?: number | null;
  CloseDate?: string | null;
};

function firstUrl(): string {
  const url = new URL(`${BASE}/Property`);
  url.searchParams.set("$top", "200");
  url.searchParams.set("$orderby", "ModificationTimestamp,ListingKey");
  url.searchParams.set("$select", "ListingKey,MlgCanUse,StandardStatus,ClosePrice,CloseDate");
  url.searchParams.set("$filter", `OriginatingSystemName eq '${OSN}'`);
  return url.toString();
}

async function fetchPage(url: string): Promise<{ rows: ResoRow[]; next?: string }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${TOKEN}` } });
    if (res.status === 429 && attempt < 2) {
      const reset = Number(res.headers.get("RateLimit-Reset") ?? "2");
      await new Promise((r) => setTimeout(r, Math.min(reset, 30) * 1000));
      continue;
    }
    if (!res.ok) throw new Error(`BBO fetch ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { value: ResoRow[]; "@odata.nextLink"?: string };
    return { rows: json.value ?? [], next: json["@odata.nextLink"] };
  }
  throw new Error("BBO fetch: rate-limited after retries");
}

async function main() {
  if (!TOKEN) throw new Error("Set MLS_GRID_BO_TOKEN or BBO_ACCESS_TOKEN");

  let url: string | undefined = firstUrl();
  let page = 0;
  let seen = 0;
  let updated = 0;
  let boFlagged = 0;

  while (url) {
    const { rows, next } = await fetchPage(url);
    seen += rows.length;

    await Promise.all(
      rows.map(async (r) => {
        if (!r.ListingKey) return;
        const mlg = r.MlgCanUse ?? [];
        const res = await prisma.listing.updateMany({
          where: { mlsId: r.ListingKey },
          data: {
            mlgCanUse: mlg,
            ...(r.ClosePrice != null ? { closePrice: r.ClosePrice } : {}),
            ...(r.CloseDate ? { closeDate: new Date(r.CloseDate) } : {}),
          },
        });
        if (res.count > 0) {
          updated += res.count;
          if (mlg.includes("BO")) boFlagged += res.count;
        }
      }),
    );

    page++;
    if (page % 10 === 0) console.log(`  page ${page}: seen=${seen} updated=${updated} bo=${boFlagged}`);
    url = next;
  }

  const dbBo = await prisma.listing.count({ where: { mlgCanUse: { has: "BO" } } });
  const dbVow = await prisma.listing.count({ where: { mlgCanUse: { has: "VOW" } } });
  console.log(`DONE pages=${page} feedRows=${seen} updated=${updated} bo-in-feed=${boFlagged}`);
  console.log(`DB now: mlgCanUse~BO=${dbBo} VOW=${dbVow}`);
  await prisma.$disconnect();
}

main();
