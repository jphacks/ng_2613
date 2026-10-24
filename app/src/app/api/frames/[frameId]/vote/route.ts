import { failure, hasSameOrigin, readJson, success } from "@/app/lib/api/api-response";
import { isUuid, validateVoteRequest } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { saveVote, VoteRepositoryError } from "@/app/lib/votes/repository";

type VoteRouteContext = {
  params: Promise<{ frameId: string }>;
};

export async function PUT(request: Request, context: VoteRouteContext) {
  if (!hasSameOrigin(request)) {
    return failure("INVALID_ORIGIN", "このリクエストは受け付けられません。", 403);
  }

  const { frameId } = await context.params;
  if (!isUuid(frameId)) {
    return failure("INVALID_FRAME_ID", "設問IDの形式が正しくありません。", 400);
  }

  const input = validateVoteRequest(await readJson(request));
  if (!input.ok) {
    return failure("VALIDATION_ERROR", "入力内容を確認してください。", 422, input.fields);
  }

  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    const { data: frame, error: frameError } = await supabase
      .from("frames")
      .select("id")
      .eq("id", frameId)
      .eq("type", "question")
      .maybeSingle();
    if (frameError) {
      return failure("FRAME_FETCH_FAILED", "設問を確認できませんでした。", 500);
    }
    if (!frame) {
      return failure("FRAME_NOT_FOUND", "指定された設問は見つかりません。", 404);
    }

    return success(await saveVote(supabase, frameId, user.id, input.value.value));
  } catch (error) {
    if (error instanceof VoteRepositoryError) {
      if (error.kind === "cooldown" || error.kind === "closed" || error.kind === "conflict") {
        return failure(`VOTE_${error.kind.toUpperCase()}`, error.message, 409);
      }
      return failure("VOTE_SAVE_FAILED", error.message, 500);
    }
    return failure("INTERNAL_ERROR", "投票処理に失敗しました。", 500);
  }
}
