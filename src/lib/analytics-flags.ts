import type { Prisma } from "@prisma/client";

export const BO_ANALYTICS_UNAVAILABLE_CODE = "BACK_OFFICE_ANALYTICS_DISABLED";
export const BO_WHERE = { mlgCanUse: { has: "BO" } } as const;

export function analyticsBoEnabled(): boolean {
  return process.env.ANALYTICS_BO_ENABLED === "true";
}

export function withBo(where: Prisma.ListingWhereInput = {}): Prisma.ListingWhereInput {
  return { ...where, mlgCanUse: { has: "BO" } };
}

export function analyticsUnavailable(feature: string) {
  return {
    available: false,
    code: BO_ANALYTICS_UNAVAILABLE_CODE,
    feature,
    message:
      "Market analytics are unavailable until the Back Office MLS feed is licensed and enabled.",
  };
}
