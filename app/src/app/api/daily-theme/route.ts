import { failure, success } from "@/app/lib/api/api-response";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { DailyThemeRepositoryError, getDailyTheme } from "@/app/lib/daily-theme/repository";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    const theme = await getDailyTheme(supabase, user.id);
    if (!theme) {
      return failure("DAILY_THEME_NOT_FOUND", "今日のテーマはまだ公開されていません。", 404);
    }
    return success(theme);
  } catch (error) {
    if (error instanceof DailyThemeRepositoryError) {
      return failure("DAILY_THEME_FETCH_FAILED", error.message, 502);
    }
    return failure("INTERNAL_ERROR", "今日のテーマの取得に失敗しました。", 500);
  }
}

