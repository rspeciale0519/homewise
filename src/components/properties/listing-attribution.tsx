import { cn } from "@/lib/utils";

interface ListingAttributionProps {
  listingOfficeName?: string | null;
  listingAgentName?: string | null;
  listingId?: string | null;
  mlsId?: string | null;
  status?: string | null;
  className?: string;
  compact?: boolean;
}

const STATUS_LABELS: Record<string, string> = {
  Pending: "Under Contract",
};

export function ListingAttribution({
  listingOfficeName,
  listingAgentName,
  listingId,
  mlsId,
  status,
  className,
  compact = false,
}: ListingAttributionProps) {
  const rawListingNumber = listingId ?? mlsId;
  const listingNumber = rawListingNumber?.startsWith("MANUAL-") ? null : rawListingNumber;
  const statusLabel = status ? STATUS_LABELS[status] ?? status : null;

  if (!listingOfficeName && !listingAgentName && !listingNumber) return null;

  const details = [
    listingNumber ? `Listing #${listingNumber}` : null,
    statusLabel,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        compact ? "text-[11px] leading-snug" : "text-xs leading-relaxed",
        "text-slate-500",
        className
      )}
    >
      {listingOfficeName ? (
        <p className="font-medium text-slate-600">Courtesy of {listingOfficeName}</p>
      ) : listingAgentName ? (
        <p className="font-medium text-slate-600">Listing agent: {listingAgentName}</p>
      ) : null}
      {details.length > 0 && <p>{details.join(" | ")}</p>}
    </div>
  );
}
