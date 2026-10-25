import { failure, success } from "@/app/lib/api/api-response";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    return success({ authenticated: user !== null, user });
  } catch {
    return failure("INTERNAL_ERROR", "ログイン状態を確認できませんでした。", 500);
  }
}
