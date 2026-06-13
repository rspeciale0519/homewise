import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { analyticsBoEnabled } from "@/lib/analytics-flags";
import { VOW_TERMS_VERSION } from "@/lib/vow";

export const metadata = { title: "MLS Compliance — Homewise Admin" };

const TIER_LABEL: Record<string, string> = {
  idx: "IDX (public)",
  vow: "VOW (registered)",
  bo: "Back Office (staff)",
};

export default async function MlsCompliancePage() {
  await requireAdmin();

  const [tierCounts, registrations, recentAccess, idxCount, vowCount, boCount] = await Promise.all([
    prisma.mlsAccessLog.groupBy({ by: ["tier"], _count: true }),
    prisma.vowRegistration.findMany({ orderBy: { acceptedAt: "desc" }, take: 50 }),
    prisma.mlsAccessLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 }),
    prisma.listing.count({ where: { mlgCanUse: { has: "IDX" } } }),
    prisma.listing.count({ where: { mlgCanUse: { has: "VOW" } } }),
    prisma.listing.count({ where: { mlgCanUse: { has: "BO" } } }),
  ]);

  const regUserIds = [...new Set(registrations.map((r) => r.userId))];
  const accessUserIds = [...new Set(recentAccess.map((a) => a.userId).filter((id): id is string => Boolean(id)))];
  const profiles = await prisma.userProfile.findMany({
    where: { id: { in: [...new Set([...regUserIds, ...accessUserIds])] } },
    select: { id: true, email: true },
  });
  const email = new Map(profiles.map((p) => [p.id, p.email]));

  const tierCountMap = new Map(tierCounts.map((t) => [t.tier, t._count]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-2xl sm:text-3xl text-navy-700 mb-2">MLS Compliance</h1>
        <p className="text-slate-500 text-sm">
          Stellar MLS / MLS GRID tier isolation, VOW registrations, and the data
          access trail (License Agreement §VIII).
        </p>
      </div>

      {/* Tier data availability */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <TierCard label="IDX — public" count={idxCount} note="withIdx() · logged-out site" />
        <TierCard label="VOW — registered" count={vowCount} note="withVow() · /vow after terms assent" />
        <TierCard
          label="Back Office — staff"
          count={boCount}
          note={`withBo() · analytics ${analyticsBoEnabled() ? "ENABLED" : "disabled"}`}
        />
      </section>

      {/* Access by tier */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-3">Access events by tier</h2>
        <div className="flex flex-wrap gap-3">
          {(["idx", "vow", "bo"] as const).map((t) => (
            <div key={t} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="text-xl font-bold text-navy-700">{tierCountMap.get(t) ?? 0}</p>
              <p className="text-xs text-slate-500">{TIER_LABEL[t]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VOW registrations */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-navy-700">VOW registrations</h2>
          <span className="text-xs text-slate-400">Current terms: {VOW_TERMS_VERSION}</span>
        </div>
        {registrations.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No VOW registrations yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Consumer</th>
                  <th className="px-4 py-2 font-medium">Terms</th>
                  <th className="px-4 py-2 font-medium">Accepted</th>
                  <th className="px-4 py-2 font-medium">IP</th>
                </tr>
              </thead>
              <tbody>
                {registrations.map((r) => (
                  <tr key={r.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 text-navy-700">{email.get(r.userId) ?? r.userId}</td>
                    <td className="px-4 py-2 text-slate-500">{r.termsVersion}{r.revokedAt ? " (revoked)" : ""}</td>
                    <td className="px-4 py-2 text-slate-500">{r.acceptedAt.toLocaleString()}</td>
                    <td className="px-4 py-2 text-slate-400">{r.ipAddress ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Access trail */}
      <section className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100">
          <h2 className="font-serif text-lg font-semibold text-navy-700">Recent data access trail</h2>
        </div>
        {recentAccess.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-400">No access events logged yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">When</th>
                  <th className="px-4 py-2 font-medium">Tier</th>
                  <th className="px-4 py-2 font-medium">Action</th>
                  <th className="px-4 py-2 font-medium">Consumer</th>
                  <th className="px-4 py-2 font-medium">Detail</th>
                </tr>
              </thead>
              <tbody>
                {recentAccess.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 last:border-0">
                    <td className="px-4 py-2 text-slate-500 whitespace-nowrap">{a.createdAt.toLocaleString()}</td>
                    <td className="px-4 py-2">
                      <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                        {a.tier}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{a.action}</td>
                    <td className="px-4 py-2 text-slate-500">{a.userId ? email.get(a.userId) ?? a.userId : "—"}</td>
                    <td className="px-4 py-2 text-slate-400">{a.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function TierCard({ label, count, note }: { label: string; count: number; note: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <p className="text-2xl font-bold text-navy-700">{count.toLocaleString()}</p>
      <p className="text-sm font-medium text-slate-600 mt-0.5">{label}</p>
      <p className="text-xs text-slate-400 mt-1">{note}</p>
    </div>
  );
}
