import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { validateProfileUpdate } from "@/app/lib/api/validation";
import { getAuthenticatedUser, getProfile } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const profile = await getProfile(supabase);
    if (!profile) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }
    return success(profile);
  } catch {
    return failure("INTERNAL_ERROR", "プロフィールを取得できませんでした。", 500);
  }
}

export async function PATCH(request: Request) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  const input = validateProfileUpdate(await readJson(request));
  if (!input.ok) {
    return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  }

  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    const { error } = await supabase
      .from("users")
      .update({
        gender: input.value.gender,
        birth_date: `${input.value.year}-01-01`,
      })
      .eq("id", user.id);

    if (error) {
      return failure("PROFILE_UPDATE_FAILED", "プロフィールを更新できませんでした。", 500);
    }

    const profile = await getProfile(supabase);
    if (!profile) {
      return failure("PROFILE_NOT_FOUND", "更新後のプロフィールを取得できませんでした。", 404);
    }

    return success(profile);
  } catch {
    return failure("INTERNAL_ERROR", "プロフィールの更新処理に失敗しました。", 500);
  }
}
