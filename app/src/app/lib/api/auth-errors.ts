import type { AuthError } from "@supabase/supabase-js";
import { failure } from "./api-response";

export function authFailure(error: AuthError) {
  switch (error.code) {
    case "over_request_rate_limit":
      return failure(
        "RATE_LIMITED",
        "認証の試行回数が上限に達しました。しばらく待ってから再度お試しください。",
        429,
      );
    case "email_provider_disabled":
      return failure("EMAIL_AUTH_NOT_CONFIGURED", "メール認証が利用できません。管理者にお問い合わせください。", 503);
    case "invalid_credentials":
      return failure("INVALID_CREDENTIALS", "メールアドレスまたはパスワードが正しくありません。", 401);
    case "email_address_invalid":
      return failure("INVALID_EMAIL", "メールアドレスを正しく入力してください。", 422);
    case "weak_password":
      return failure("WEAK_PASSWORD", "パスワードが要件を満たしていません。", 422);
    case "user_already_exists":
    case "email_exists":
      return failure("USER_ALREADY_EXISTS", "このメールアドレスはすでに登録されています。", 409);
    case "signup_disabled":
      return failure("SIGN_UP_DISABLED", "現在、新規登録は利用できません。", 503);
    default:
      return failure("AUTH_FAILED", "認証処理に失敗しました。時間を置いて再度お試しください。", 400);
  }
}
