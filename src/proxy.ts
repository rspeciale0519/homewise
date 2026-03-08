import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const LEAD_SOURCE_COOKIE = "hw_lead_source";
const LISTING_VIEW_COOKIE = "hw_listing_views";
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  const { searchParams, pathname } = request.nextUrl;

  // Lead source tracking: capture ?source= param into cookie
  const source = searchParams.get("source");
  if (source) {
    response.cookies.set(LEAD_SOURCE_COOKIE, source, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
  }

  // Visitor registration wall: track listing view count
  if (pathname.match(/^\/properties\/[^/]+$/) && !pathname.endsWith("/properties")) {
    const current = parseInt(request.cookies.get(LISTING_VIEW_COOKIE)?.value ?? "0", 10);
    response.cookies.set(LISTING_VIEW_COOKIE, String(current + 1), {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
