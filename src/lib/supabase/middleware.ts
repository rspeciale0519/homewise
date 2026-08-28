import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  function redirectWithSessionCookies(url: URL): NextResponse {
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("redirectTo", `${pathname}${request.nextUrl.search}`);
    return redirectWithSessionCookies(url);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectTo = safeAuthRedirectPath(
      request.nextUrl.searchParams.get("redirectTo"),
    );
    const url = new URL(redirectTo, request.nextUrl.origin);
    return redirectWithSessionCookies(url);
  }

  return supabaseResponse;
}
