import { failure, success } from "@/app/lib/api/api-response";
import { isUuid } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { CatalogRepositoryError, getTopicDetail } from "@/app/lib/catalog/repository";
import { createClient } from "@/app/lib/supabase/server";

type TopicRouteContext = {
  params: Promise<{ topicId: string }>;
};

export async function GET(_request: Request, context: TopicRouteContext) {
  const { topicId } = await context.params;
  if (!isUuid(topicId)) {
    return failure("INVALID_TOPIC_ID", "トピックIDの形式が正しくありません。", 400);
  }

  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    const topic = await getTopicDetail(supabase, topicId);
    if (!topic) {
      return failure("TOPIC_NOT_FOUND", "指定されたトピックは見つかりません。", 404);
    }
    return success(topic);
  } catch (error) {
    if (error instanceof CatalogRepositoryError) {
      return failure("TOPIC_FETCH_FAILED", error.message, 502);
    }
    return failure("INTERNAL_ERROR", "トピックの取得処理に失敗しました。", 500);
  }
}
