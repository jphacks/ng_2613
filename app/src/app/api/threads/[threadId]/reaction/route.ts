import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { isUuid } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { setThreadReaction } from "@/app/lib/threads/reactions";
import { ThreadRepositoryError } from "@/app/lib/threads/repository";

type Context = { params: Promise<{ threadId: string }> };

export async function PUT(request: Request, context: Context) {
  if (!hasSameOrigin(request)) return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  const { threadId } = await context.params;
  if (!isUuid(threadId)) return failure("INVALID_THREAD_ID", "スレッドIDの形式が正しくありません。", 400);
  const input = await readJson(request);
  if (!input || typeof input !== "object" || !("reacted" in input) || typeof input.reacted !== "boolean") {
    return failure("VALIDATION_ERROR", "なるほどの状態が正しくありません。", 422);
  }
  try {
    const client = await createClient();
    const user = await getAuthenticatedUser(client);
    if (!user) return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    return success(await setThreadReaction(client, threadId, user.id, input.reacted));
  } catch (error) {
    if (error instanceof ThreadRepositoryError) {
      return failure("REACTION_FAILED", error.message, error.kind === "not_found" ? 404 : error.kind === "closed" ? 403 : 500);
    }
    return failure("INTERNAL_ERROR", "なるほどの保存処理に失敗しました。", 500);
  }
}
