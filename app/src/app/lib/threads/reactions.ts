import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { ThreadRepositoryError } from "./repository.ts";

export async function setThreadReaction(client: SupabaseClient<Database>, threadId: string, userId: string, reacted: boolean) {
  const { data: thread, error: threadError } = await client.from("threads")
    .select("id").eq("id", threadId).eq("type", "user").maybeSingle();
  if (threadError) throw new ThreadRepositoryError("unknown", "意見を確認できませんでした。");
  if (!thread) throw new ThreadRepositoryError("not_found", "指定された意見は見つかりません。");

  if (reacted) {
    // DO NOTHING on duplicates preserves the original reaction-time vote snapshot.
    const { error } = await client.from("thread_reactions").upsert(
      { thread_id: threadId, user_id: userId },
      { onConflict: "thread_id,user_id", ignoreDuplicates: true },
    );
    if (error) throw new ThreadRepositoryError(error.code === "42501" ? "closed" : "unknown", "なるほどを保存できませんでした。");
  } else {
    const { error } = await client.from("thread_reactions").delete().eq("thread_id", threadId).eq("user_id", userId);
    if (error) throw new ThreadRepositoryError("unknown", "なるほどを解除できませんでした。");
  }
  return { reacted };
}
