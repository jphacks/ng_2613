import { failure, hasSameOrigin, success } from "@/app/lib/api/api-response";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      return failure("SIGN_OUT_FAILED", "ログアウトに失敗しました。", 400);
    }
    return success({ authenticated: false });
  } catch {
    return failure("INTERNAL_ERROR", "ログアウト処理に失敗しました。", 500);
  }
}
