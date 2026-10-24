import { failure, success } from "@/app/lib/api/api-response";
import { getAuthenticatedUser } from "@/app/lib/auth/profile";
import { CatalogRepositoryError, getCatalog } from "@/app/lib/catalog/repository";
import { createClient } from "@/app/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser(supabase);
    if (!user) {
      return failure("UNAUTHENTICATED", "ログインが必要です。", 401);
    }

    return success(await getCatalog(supabase));
  } catch (error) {
    if (error instanceof CatalogRepositoryError) {
      return failure("CATALOG_FETCH_FAILED", error.message, 502);
    }
    return failure("INTERNAL_ERROR", "分類データの取得処理に失敗しました。", 500);
  }
}
