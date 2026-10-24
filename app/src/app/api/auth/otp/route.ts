import { authFailure } from "@/app/lib/api/auth-errors";
import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { validateOtpRequest } from "@/app/lib/api/validation";
import { createClient } from "@/app/lib/supabase/server";

export async function POST(request: Request) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  const input = validateOtpRequest(await readJson(request));
  if (!input.ok) {
    return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: input.value.email,
      options: {
        shouldCreateUser: input.value.flow === "sign-up",
      },
    });

    if (error) {
      return authFailure(error);
    }

    return success({ sent: true, email: input.value.email });
  } catch {
    return failure("INTERNAL_ERROR", "認証メールの送信処理に失敗しました。", 500);
  }
}
