export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;

  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] ?? 0;

  const lower = sorted[middle - 1] ?? 0;
  const upper = sorted[middle] ?? 0;
  return Math.round((lower + upper) / 2);
}

export function calculateSaleToListRatio(
  averageClosePrice: number,
  averageListPrice: number,
): number {
  if (averageClosePrice <= 0 || averageListPrice <= 0) return 0;
  return Math.round((averageClosePrice / averageListPrice) * 1_000) / 1_000;
}
