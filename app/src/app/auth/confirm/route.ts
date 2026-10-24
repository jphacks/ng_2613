import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/app/lib/supabase/server";

function createRedirectUrl(request: NextRequest) {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/";
  redirectUrl.search = "";
  redirectUrl.hash = "";
  return redirectUrl;
}

function redirect(request: NextRequest, errorCode?: "confirmation_failed") {
  const redirectUrl = createRedirectUrl(request);
  if (errorCode) {
    redirectUrl.searchParams.set("auth_error", errorCode);
    redirectUrl.hash = "login";
  }

  const response = NextResponse.redirect(redirectUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (!tokenHash || type !== "email") {
    return redirect(request, "confirmation_failed");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    return error
      ? redirect(request, "confirmation_failed")
      : redirect(request);
  } catch {
    return redirect(request, "confirmation_failed");
  }
}
