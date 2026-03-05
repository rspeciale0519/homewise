import { cookies } from "next/headers";

const COOKIE_NAME = "hw_lead_source";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function captureLeadSource(source: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, source, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function getLeadSource(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? "website";
}
