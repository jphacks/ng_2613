import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { isUuid, validateThreadRequest } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { after } from "next/server";
import { saveThreadEmbedding } from "@/app/lib/representatives/repository";
import { createThread, getThreads, ThreadRepositoryError } from "@/app/lib/threads/repository";

type ThreadsRouteContext = { params: Promise<{ frameId: string }> };

function repositoryFailure(error: ThreadRepositoryError) {
  if (error.kind === "not_found") return failure("FRAME_NOT_FOUND", error.message, 404);
  if (error.kind === "closed") return failure("POSTING_CLOSED", error.message, 409);
  return failure("THREAD_OPERATION_FAILED", error.message, 500);
}

export async function GET(_request: Request, context: ThreadsRouteContext) {
  const { frameId } = await context.params;
  if (!isUuid(frameId)) return failure("INVALID_FRAME_ID", "設問IDの形式が正しくありません。", 400);
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    return success(await getThreads(supabase, frameId, user.id));
  } catch (error) {
    return error instanceof ThreadRepositoryError
      ? repositoryFailure(error)
      : failure("INTERNAL_ERROR", "スレッドの取得処理に失敗しました。", 500);
  }
}

export async function POST(request: Request, context: ThreadsRouteContext) {
  if (!hasSameOrigin(request)) return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  const { frameId } = await context.params;
  if (!isUuid(frameId)) return failure("INVALID_FRAME_ID", "設問IDの形式が正しくありません。", 400);
  const input = validateThreadRequest(await readJson(request));
  if (!input.ok) return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    const created = await createThread(supabase, frameId, user.id, input.value);
    // 観点の判定に使うベクトルは、応答を返したあとに1回だけ作る
    after(() => saveThreadEmbedding({ id: created.id, title: input.value.title, body: input.value.body }));
    return success(created, 201);
  } catch (error) {
    return error instanceof ThreadRepositoryError
      ? repositoryFailure(error)
      : failure("INTERNAL_ERROR", "スレッドの作成処理に失敗しました。", 500);
  }
}
