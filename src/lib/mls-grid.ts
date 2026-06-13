import type { ResoODataResponse, ResoOpenHouse, ResoProperty } from "@/types/reso";

type PropertyUrlOptions = {
  modifiedAfter?: string;
  initialImport?: boolean;
  top?: number;
};

type OpenHouseUrlOptions = {
  modifiedAfter?: string;
  top?: number;
};

const DEFAULT_BASE_URL = "https://api.mlsgrid.com/v2";

function baseUrl(): string {
  return process.env.MLS_GRID_BASE_URL ?? DEFAULT_BASE_URL;
}

function token(): string {
  // Prefer the Broker Back Office token when present: it is a strict superset
  // that returns MlgCanUse=["BO","IDX","VOW"] on each record, so a single sync
  // stamps every applicable permission flag. Public surfaces still gate on
  // withIdx() (IDX flag present); BO analytics gate on withBo(). Without this
  // preference, an IDX-only token would re-stamp mlgCanUse=["IDX"] on every
  // modified row and silently strip the BO/VOW flags over time.
  return process.env.MLS_GRID_BO_TOKEN ?? process.env.BBO_ACCESS_TOKEN ?? process.env.MLS_GRID_TOKEN ?? "";
}

function originatingSystem(): string {
  return process.env.MLS_GRID_ORIGINATING_SYSTEM_NAME ?? "";
}

function escapeODataString(value: string): string {
  return value.replaceAll("'", "''");
}

function addFilter(url: URL, filter: string): void {
  const existing = url.searchParams.get("$filter");
  url.searchParams.set("$filter", existing ? `${existing} and ${filter}` : filter);
}

export function hasCredentials(): boolean {
  return Boolean(token() && originatingSystem());
}

export function buildPropertyUrl({
  modifiedAfter,
  initialImport = false,
  top = 200,
}: PropertyUrlOptions): string {
  const url = new URL(`${baseUrl()}/Property`);
  url.searchParams.set("$top", String(top));
  url.searchParams.set("$expand", "Media");
  url.searchParams.set("$orderby", "ModificationTimestamp,ListingKey");
  addFilter(url, `OriginatingSystemName eq '${escapeODataString(originatingSystem())}'`);

  if (initialImport) {
    addFilter(url, "MlgCanView eq true");
  }

  if (modifiedAfter) {
    addFilter(url, `ModificationTimestamp ge ${modifiedAfter}`);
  }

  const officeId = process.env.MLS_OFFICE_ID?.trim();
  if (officeId) {
    addFilter(url, `ListOfficeMlsId eq '${escapeODataString(officeId)}'`);
  }

  return url.toString();
}

export function buildOpenHouseUrl({ modifiedAfter, top = 200 }: OpenHouseUrlOptions): string {
  const url = new URL(`${baseUrl()}/OpenHouse`);
  url.searchParams.set("$top", String(top));
  url.searchParams.set("$orderby", "ModificationTimestamp,OpenHouseKey");
  addFilter(url, `OriginatingSystemName eq '${escapeODataString(originatingSystem())}'`);

  if (modifiedAfter) {
    addFilter(url, `ModificationTimestamp ge ${modifiedAfter}`);
  }

  return url.toString();
}

export async function authedFetch<T = ResoProperty>(
  url: string,
): Promise<ResoODataResponse<T>> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token()}` },
    });

    if (res.status === 429 && attempt === 0) {
      const reset = Number(res.headers.get("RateLimit-Reset") ?? "2");
      await new Promise((resolve) => setTimeout(resolve, Math.min(reset, 30) * 1000));
      continue;
    }

    if (!res.ok) {
      throw new Error(`MLS Grid fetch error: ${res.status} ${await res.text()}`);
    }

    return (await res.json()) as ResoODataResponse<T>;
  }

  throw new Error("MLS Grid: rate-limited after retry");
}

export async function fetchPage(
  urlOrOptions: string | PropertyUrlOptions,
): Promise<ResoODataResponse> {
  const url = typeof urlOrOptions === "string" ? urlOrOptions : buildPropertyUrl(urlOrOptions);
  return authedFetch<ResoProperty>(url);
}

export async function fetchOpenHousePage(
  urlOrOptions: string | OpenHouseUrlOptions,
): Promise<ResoODataResponse<ResoOpenHouse>> {
  const url = typeof urlOrOptions === "string" ? urlOrOptions : buildOpenHouseUrl(urlOrOptions);
  return authedFetch<ResoOpenHouse>(url);
}

export async function fetchListings(params: {
  modifiedAfter?: string;
  top?: number;
  skip?: number;
}): Promise<ResoODataResponse> {
  const url = new URL(buildPropertyUrl(params));
  if (params.skip) {
    url.searchParams.set("$skip", String(params.skip));
  }
  return fetchPage(url.toString());
}
