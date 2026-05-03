import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  RESEND_RATE_LIMIT_MS,
  mailClassLabel,
  productTypeLabel,
  workflowLabel,
  type MailClass,
  type ProductType,
  type Workflow,
} from "@/lib/direct-mail/constants";
import { getSignedUrl } from "@/lib/direct-mail/storage";
import type { ReturnAddress } from "@/lib/direct-mail/schemas";
import type { ArtworkFile, ListFile } from "@/lib/direct-mail/types";
import { YlsPill } from "../../_components/yls-pill";
import { YlsFulfillmentFooter } from "../../_components/yls-fulfillment-footer";
import { OrderDetailActions } from "../_components/order-detail-actions";

export default async function MailOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ just_submitted?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const justSubmitted = sp.just_submitted === "1";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirectTo=/dashboard/direct-mail/orders/${id}`);

  const order = await prisma.mailOrder.findUnique({ where: { id } });
  if (!order || order.userId !== user.id) notFound();

  const summaryUrl = order.summaryPdfKey
    ? await getSignedUrl(order.summaryPdfKey, 60 * 60).catch(() => null)
    : null;
  const artworkFiles = Array.isArray(order.artworkFiles)
    ? (order.artworkFiles as unknown as ArtworkFile[])
    : [];
  const listFiles = Array.isArray(order.listFiles)
    ? (order.listFiles as unknown as ListFile[])
    : [];
  const artworkUrls: Array<{ file: ArtworkFile; url: string | null }> = await Promise.all(
    artworkFiles.map(async (f) => ({
      file: f,
      url: await getSignedUrl(f.fileKey, 60 * 60).catch(() => null),
    })),
  );
  const listUrls: Array<{ file: ListFile; url: string | null }> = await Promise.all(
    listFiles.map(async (f) => ({
      file: f,
      url: await getSignedUrl(f.fileKey, 60 * 60).catch(() => null),
    })),
  );

  const ra = order.returnAddress as unknown as ReturnAddress | null;
  const stamp = order.submittedAt ?? order.createdAt;
  const lastDispatchedAtMs = order.lastDispatchedAt
    ? order.lastDispatchedAt.getTime()
    : null;

  return (
    <div className="p-6 sm:p-8 lg:p-10 max-w-5xl">
      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <Link
            href="/dashboard/direct-mail/orders"
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-crimson-600 mb-2"
          >
            ← My mail orders
          </Link>
          <h1 className="font-serif text-display-sm sm:text-display-md text-navy-700">
            {formatStamp(stamp)}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {workflowLabel(order.workflow as Workflow)}
            {order.productType
              ? ` · ${productTypeLabel(order.productType as ProductType)}${order.productSize ? ` ${order.productSize}` : ""}`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill emailStatus={order.emailStatus} status={order.status} />
          <YlsPill />
        </div>
      </div>

      {justSubmitted && order.status === "submitted" && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              ✓
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-emerald-900">
                Order received — your YLS rep will email proofs within 1 business day.
              </p>
              <p className="mt-1 text-sm text-emerald-800/80">
                Watch for an email from <span className="font-medium">yellowlettershop.com</span>.
                Check your spam folder if you don&apos;t see it.
              </p>
            </div>
          </div>
        </div>
      )}

      {order.status === "submitted" && (
        <div className="mb-6">
          <OrderDetailActions
            orderId={order.id}
            summaryUrl={summaryUrl}
            hasList={listFiles.length > 0}
            lastDispatchedAtMs={lastDispatchedAtMs}
            rateLimitMs={RESEND_RATE_LIMIT_MS}
          />
        </div>
      )}

      <dl className="rounded-2xl border border-slate-100 divide-y divide-slate-100 overflow-hidden bg-white text-sm mb-6">
        {order.subjectPropertyAddress && (
          <Row label="Subject property" value={order.subjectPropertyAddress} />
        )}
        {order.campaignName && <Row label="Campaign name" value={order.campaignName} />}
        <Row
          label="Mail class"
          value={order.mailClass ? mailClassLabel(order.mailClass as MailClass) : "—"}
        />
        <Row
          label="Drop date"
          value={order.dropDate ? formatDate(order.dropDate) : "—"}
        />
        <Row label="Quantity" value={`${order.quantity.toLocaleString()} pieces`} />
        <Row
          label="Total recipients"
          value={`${listFiles.reduce((s, l) => s + l.rowCount, 0).toLocaleString()}`}
        />
        <Row
          label="Return address"
          value={
            ra
              ? `${ra.name} · ${ra.address1}${ra.address2 ? `, ${ra.address2}` : ""}, ${ra.city}, ${ra.state} ${ra.zip}`
              : "—"
          }
        />
        {order.specialInstructions && (
          <Row label="Special instructions" value={order.specialInstructions} />
        )}
      </dl>

      <section className="mb-6">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-3">
          Mailing lists ({listUrls.length})
        </h2>
        {listUrls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No mailing lists attached.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {listUrls.map(({ file, url }) => {
              const keptCols = file.columns.filter(
                (c) => !file.excludedColumns.includes(c),
              );
              return (
                <li
                  key={file.id}
                  className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5 truncate">
                      {file.fileName} · {file.rowCount.toLocaleString()} rows ·{" "}
                      {keptCols.length} of {file.columns.length} columns sent
                    </p>
                    {file.excludedColumns.length > 0 && (
                      <p className="text-[11px] text-amber-700 mt-1 truncate">
                        Excluded: {file.excludedColumns.join(", ")}
                      </p>
                    )}
                  </div>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs font-semibold text-navy-600 hover:text-crimson-600"
                    >
                      Open ↗
                    </a>
                  ) : (
                    <span className="shrink-0 text-xs text-slate-400">unavailable</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mb-6">
        <h2 className="font-serif text-lg font-semibold text-navy-700 mb-3">
          Artwork files ({artworkUrls.length})
        </h2>
        {artworkUrls.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No artwork files attached.
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2">
            {artworkUrls.map(({ file, url }) => (
              <li
                key={file.id}
                className="flex items-center gap-4 rounded-xl border border-slate-100 bg-white p-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-700 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">
                    {file.fileName} · {formatBytes(file.byteSize)}
                  </p>
                </div>
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-xs font-semibold text-navy-600 hover:text-crimson-600"
                  >
                    Open ↗
                  </a>
                ) : (
                  <span className="shrink-0 text-xs text-slate-400">unavailable</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>


      {order.status === "submitted" && (
        <YlsFulfillmentFooter />
      )}
    </div>
  );
}

function StatusPill({
  emailStatus,
  status,
}: {
  emailStatus: string;
  status: string;
}) {
  if (status === "draft") {
    return (
      <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        Draft
      </span>
    );
  }
  const fallback = { label: "Submitted", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  const map: Record<string, { label: string; classes: string }> = {
    sent: fallback,
    none: fallback,
    pending: { label: "Sending…", classes: "bg-slate-100 text-slate-600 border-slate-200" },
    failed: { label: "Awaiting send", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  };
  const cfg = map[emailStatus] ?? fallback;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${cfg.classes}`}
    >
      {cfg.label}
    </span>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-3">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wider text-slate-400 sm:w-44">
        {label}
      </dt>
      <dd className="break-words text-sm text-navy-700">{value}</dd>
    </div>
  );
}

function formatStamp(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(d));
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(d));
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
