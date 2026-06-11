import type { Prisma } from "@prisma/client";

export const IDX_WHERE = { mlgCanUse: { has: "IDX" } } as const;

export function withIdx(where: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return { ...where, mlgCanUse: { has: "IDX" } };
}
