import type { ResoODataResponse } from "@/types/reso";

const BASE_URL = process.env.MLS_GRID_BASE_URL ?? "https://api.mlsgrid.com/v2";
const CLIENT_ID = process.env.MLS_GRID_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.MLS_GRID_CLIENT_SECRET ?? "";

let cachedToken: { token: string; expiresAt: number } | null = null;

export function hasCredentials(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const res = await fetch(`${BASE_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`MLS Grid token error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return cachedToken.token;
}

export async function fetchListings(params: {
  modifiedAfter?: string;
  top?: number;
  skip?: number;
}): Promise<ResoODataResponse> {
  const token = await getToken();
  const { modifiedAfter, top = 200, skip = 0 } = params;

  const url = new URL(`${BASE_URL}/Property`);
  url.searchParams.set("$top", String(top));
  url.searchParams.set("$skip", String(skip));
  url.searchParams.set("$orderby", "ModificationTimestamp desc");

  if (modifiedAfter) {
    url.searchParams.set("$filter", `ModificationTimestamp gt ${modifiedAfter}`);
  }

  const officeId = process.env.MLS_OFFICE_ID;
  if (officeId) {
    const existing = url.searchParams.get("$filter");
    const officeFilter = `ListOfficeMlsId eq '${officeId}'`;
    url.searchParams.set("$filter", existing ? `${existing} and ${officeFilter}` : officeFilter);
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`MLS Grid fetch error: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as ResoODataResponse;
}
