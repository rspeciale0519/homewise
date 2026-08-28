import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthRedirectPath } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as "signup" | "email" | "recovery" | null;
  const redirectTo = safeAuthRedirectPath(searchParams.get("redirectTo"));

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

    if (!error) {
      return NextResponse.redirect(`${origin}${redirectTo}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation`);
}
