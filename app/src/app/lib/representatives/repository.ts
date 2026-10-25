import { createAdminClient } from "../supabase/admin";
import type { PostStance } from "../threads/types";
import { embeddingDimensions, embeddingModel, embeddingText, embedTexts } from "./gemini-embedding";
import { selectRepresentatives, type RepresentativeCandidate } from "./select";

type RankTarget = { id: string; stance: PostStance; createdAt: string };

// 賛成・反対それぞれで代表に選んだ意見に、1 から始まる順位を付ける。
// なるほどの数やベクトルが読めないときは、それなしで（新しい順で）選ぶ。数そのものは返さない。
export async function rankRepresentatives(frameId: string, threads: RankTarget[]) {
  const reactions = new Map<string, { agree: number; disagree: number }>();
  const embeddings = new Map<string, number[]>();
  const admin = createAdminClient();
  if (admin && threads.length > 0) {
    const [counts, vectors] = await Promise.all([
      admin.rpc("get_thread_reaction_counts", { target_frame_id: frameId }),
      admin.from("thread_embeddings")
        .select("thread_id, embedding")
        .eq("model", embeddingModel())
        .in("thread_id", threads.map((thread) => thread.id)),
    ]);
    if (counts.error) console.error("Failed to read reaction counts for representatives");
    counts.data?.forEach((row) => reactions.set(row.thread_id, { agree: Number(row.agree_count), disagree: Number(row.disagree_count) }));
    if (vectors.error) console.error("Failed to read thread embeddings for representatives");
    vectors.data?.forEach((row) => {
      if (row.embedding.length === embeddingDimensions) embeddings.set(row.thread_id, row.embedding);
    });
  }

  const ranks = new Map<string, number>();
  for (const stance of ["agree", "disagree"] as const) {
    const candidates = threads
      .filter((thread) => thread.stance === stance)
      .map((thread): RepresentativeCandidate => ({
        id: thread.id,
        createdAt: thread.createdAt,
        agreeReactions: reactions.get(thread.id)?.agree ?? 0,
        disagreeReactions: reactions.get(thread.id)?.disagree ?? 0,
        embedding: embeddings.get(thread.id) ?? null,
      }));
    selectRepresentatives(candidates).forEach((id, index) => ranks.set(id, index + 1));
  }
  return ranks;
}

// 投稿した意見のベクトルを1回だけ作って保存する。失敗しても投稿には影響させず、ログだけ残す
export async function saveThreadEmbedding(thread: { id: string; title: string; body: string }) {
  const admin = createAdminClient();
  if (!admin || !process.env.GEMINI_API_KEY) return;
  try {
    const [embedding] = await embedTexts([embeddingText(thread)]);
    const { error } = await admin.from("thread_embeddings").upsert({
      thread_id: thread.id,
      model: embeddingModel(),
      embedding,
    });
    if (error) console.error("Failed to save thread embedding");
  } catch {
    console.error("Failed to create thread embedding");
  }
}
