import { failure, success } from "@/app/lib/api/api-response";
import { isUuid } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { getThreadDetail, ThreadRepositoryError } from "@/app/lib/threads/repository";

type ThreadRouteContext = { params: Promise<{ threadId: string }> };

export async function GET(_request: Request, context: ThreadRouteContext) {
  const { threadId } = await context.params;
  if (!isUuid(threadId)) return failure("INVALID_THREAD_ID", "スレッドIDの形式が正しくありません。", 400);
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    return success(await getThreadDetail(supabase, threadId));
  } catch (error) {
    if (error instanceof ThreadRepositoryError) {
      return error.kind === "not_found"
        ? failure("THREAD_NOT_FOUND", error.message, 404)
        : failure("THREAD_FETCH_FAILED", error.message, 500);
    }
    return failure("INTERNAL_ERROR", "スレッドの取得処理に失敗しました。", 500);
  }
}
