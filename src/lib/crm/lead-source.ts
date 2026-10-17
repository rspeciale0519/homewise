import { cookies } from "next/headers";
import { isSafeLeadSource } from "@/lib/crm/lead-source-value";

export { isSafeLeadSource };

const COOKIE_NAME = "hw_lead_source";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function captureLeadSource(source: string) {
  if (!isSafeLeadSource(source)) return;

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, source, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function getLeadSource(): Promise<string> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? "website";
}
