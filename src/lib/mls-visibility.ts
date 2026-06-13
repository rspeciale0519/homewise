import type { Prisma } from "@prisma/client";

export const IDX_WHERE = { mlgCanUse: { has: "IDX" } } as const;

export const VOW_WHERE = { mlgCanUse: { has: "VOW" } } as const;

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

/**
 * VOW (Virtual Office Website) visibility: VOW-licensed MLS rows plus approved
 * manual listings. The VOW set is a superset of the IDX set — registered
 * consumers (established broker-consumer relationship + accepted VOW terms) may
 * see VOW-flagged listings the public IDX site excludes. Gate every VOW query
 * behind an authenticated, VOW-registered session.
 */
export function withVow(where: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return {
    AND: [where, { OR: [VOW_WHERE, MANUAL_VISIBLE_WHERE] }],
  };
}
