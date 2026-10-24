import type { AuthError } from "@supabase/supabase-js";
import { failure } from "./api-response";

export function authFailure(error: AuthError) {
  switch (error.code) {
    case "otp_expired":
      return failure("OTP_EXPIRED", "認証コードの有効期限が切れています。もう一度送信してください。", 400);
    case "over_sms_send_rate_limit":
    case "over_request_rate_limit":
      return failure("RATE_LIMITED", "しばらく待ってから、もう一度お試しください。", 429);
    case "phone_provider_disabled":
    case "otp_disabled":
      return failure("SMS_AUTH_NOT_CONFIGURED", "SMS認証が利用できません。管理者にお問い合わせください。", 503);
    case "invalid_credentials":
      return failure("INVALID_OTP", "電話番号または認証コードが正しくありません。", 400);
    default:
      return failure("AUTH_FAILED", "認証処理に失敗しました。時間を置いて再度お試しください。", 400);
  }
}
