export const ANOMALY_KINDS = {
  priceDrop: "price-drop",
  staleDom: "stale-dom",
  duplicateAddress: "duplicate-address",
  noPhotos: "no-photos",
} as const;

export const PRICE_DROP_THRESHOLD = 0.15;
export const PRICE_DROP_WINDOW_DAYS = 7;
export const STALE_DOM_THRESHOLD = 180;

export type PricePointLike = { price: number; observedAt: Date };

/**
 * Largest relative drop from any price observed inside the window to the
 * current price. Returns 0 when there is no drop.
 */
export function priceDropFraction(
  history: PricePointLike[],
  currentPrice: number,
  now: Date,
  windowDays = PRICE_DROP_WINDOW_DAYS,
): number {
  const cutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000);
  const windowPrices = history
    .filter((point) => point.observedAt >= cutoff && point.price > 0)
    .map((point) => point.price);
  if (windowPrices.length === 0 || currentPrice <= 0) return 0;

  const maxInWindow = Math.max(...windowPrices);
  if (maxInWindow <= currentPrice) return 0;
  return (maxInWindow - currentPrice) / maxInWindow;
}

export function isStaleListing(daysOnMarket: number, status: string): boolean {
  return status === "Active" && daysOnMarket > STALE_DOM_THRESHOLD;
}

export function duplicateKey(address: string, city: string): string {
  return `${address.trim().toLowerCase()}|${city.trim().toLowerCase()}`;
}
