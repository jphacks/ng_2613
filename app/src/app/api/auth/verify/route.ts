import { authFailure } from "@/app/lib/api/auth-errors";
import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { validateOtpVerification } from "@/app/lib/api/validation";
import { getProfile } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  const input = validateOtpVerification(await readJson(request));
  if (!input.ok) {
    return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      phone: input.value.phone,
      token: input.value.token,
      type: "sms",
    });

    if (error) {
      return authFailure(error);
    }
    if (!data.user) {
      return failure("AUTH_FAILED", "認証情報を確認できませんでした。", 401);
    }

    if (input.value.flow === "sign-up") {
      const { gender, year } = input.value;
      if (!gender || year === undefined) {
        return failure("VALIDATION_ERROR", "プロフィール情報を確認してください。", 422);
      }

      const { error: profileError } = await supabase
        .from("users")
        .update({ gender, birth_date: `${year}-01-01` })
        .eq("id", data.user.id);

      if (profileError) {
        return failure(
          "PROFILE_UPDATE_FAILED",
          "認証には成功しましたが、プロフィールを保存できませんでした。",
          500,
        );
      }
    }

    const profile = await getProfile(supabase);
    if (!profile) {
      return failure("PROFILE_NOT_FOUND", "プロフィールを取得できませんでした。", 404);
    }

    return success({ authenticated: true, profile });
  } catch {
    return failure("INTERNAL_ERROR", "認証コードの確認処理に失敗しました。", 500);
  }
}
