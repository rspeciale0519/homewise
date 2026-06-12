import type { Prisma } from "@prisma/client";

export const IDX_WHERE = { mlgCanUse: { has: "IDX" } } as const;

export const MANUAL_VISIBLE_WHERE = {
  mlsSource: "manual",
  manualStatus: "approved",
} as const;

/**
 * Public listing visibility: IDX-licensed MLS rows plus approved manual
 * (exclusive/pocket) listings. MLS rows must never appear publicly without
 * the IDX flag — compliance requirement, do not widen.
 */
export function withIdx(where: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return {
    AND: [where, { OR: [IDX_WHERE, MANUAL_VISIBLE_WHERE] }],
  };
}
