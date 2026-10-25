import { authFailure } from "@/app/lib/api/auth-errors";
import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { validateSignUpRequest } from "@/app/lib/api/validation";
import { hasAuthenticatedSession } from "@/app/lib/auth/auth-flow";
import { getProfile } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  const input = validateSignUpRequest(await readJson(request));
  if (!input.ok) {
    return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email: input.value.email,
      password: input.value.password,
    });

    if (error) return authFailure(error);
    if (!hasAuthenticatedSession(data)) {
      return failure(
        "SIGN_UP_SESSION_MISSING",
        "登録後のログイン状態を確認できませんでした。メール確認が無効になっていることを確認してください。",
        409,
      );
    }

    const profile = await getProfile(supabase);
    if (!profile) {
      return failure("PROFILE_NOT_FOUND", "プロフィールを取得できませんでした。", 404);
    }

    return success({ authenticated: true, profile }, 201);
  } catch {
    return failure("INTERNAL_ERROR", "新規登録処理に失敗しました。", 500);
  }
}
