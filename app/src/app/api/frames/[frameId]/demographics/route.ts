import { failure, success } from "@/app/lib/api/api-response";
import { isUuid } from "@/app/lib/api/validation";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { createClient } from "@/app/lib/supabase/server";
import { DemographicsUnavailableError, getFrameVoteDemographics } from "@/app/lib/votes/repository";

type DemographicsRouteContext = {
  params: Promise<{ frameId: string }>;
};

export async function GET(_request: Request, context: DemographicsRouteContext) {
  const { frameId } = await context.params;
  if (!isUuid(frameId)) {
    return failure("INVALID_FRAME_ID", "設問IDの形式が正しくありません。", 400);
  }

  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    return success(await getFrameVoteDemographics(supabase, frameId));
  } catch (error) {
    if (error instanceof DemographicsUnavailableError) {
      return failure("DEMOGRAPHICS_UNAVAILABLE", error.message, 503);
    }
    return failure("DEMOGRAPHICS_FETCH_FAILED", "年代・性別の集計を取得できませんでした。", 500);
  }
}
