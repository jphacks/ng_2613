import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { isUuid, validateCommentRequest } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { createComment, ThreadRepositoryError } from "@/app/lib/threads/repository";

type CommentsRouteContext = { params: Promise<{ threadId: string }> };

export async function POST(request: Request, context: CommentsRouteContext) {
  if (!hasSameOrigin(request)) return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  const { threadId } = await context.params;
  if (!isUuid(threadId)) return failure("INVALID_THREAD_ID", "スレッドIDの形式が正しくありません。", 400);
  const input = validateCommentRequest(await readJson(request));
  if (!input.ok) return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    return success(await createComment(supabase, threadId, user.id, input.value), 201);
  } catch (error) {
    if (error instanceof ThreadRepositoryError) {
      return error.kind === "closed"
        ? failure("POSTING_CLOSED", error.message, 409)
        : failure("COMMENT_CREATE_FAILED", error.message, 500);
    }
    return failure("INTERNAL_ERROR", "コメントの投稿処理に失敗しました。", 500);
  }
}
