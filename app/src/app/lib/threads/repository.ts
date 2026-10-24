import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { PostAuthor, PostStance, ThreadDetail, ThreadSummary } from "./types";

const threadLimit = 50;
const commentLimit = 100;

export class ThreadRepositoryError extends Error {
  readonly kind: "not_found" | "closed" | "unknown";

  constructor(kind: "not_found" | "closed" | "unknown", message: string) {
    super(message);
    this.kind = kind;
  }
}

async function getAuthors(client: SupabaseClient<Database>, userIds: string[]) {
  const uniqueIds = [...new Set(userIds)];
  if (uniqueIds.length === 0) return new Map<string, PostAuthor>();
  const { data, error } = await client
    .from("public_profiles")
    .select("id, username")
    .in("id", uniqueIds);
  if (error) throw new ThreadRepositoryError("unknown", "投稿者情報を取得できませんでした。");
  return new Map(data.map((profile) => [profile.id, { id: profile.id, username: profile.username }]));
}

function authorFor(authors: Map<string, PostAuthor>, userId: string) {
  return authors.get(userId) ?? { id: userId, username: "ユーザー" };
}

function mapWriteError(error: { code?: string }) {
  return error.code === "42501" || error.code === "23514"
    ? new ThreadRepositoryError("closed", "この設問は現在投稿を受け付けていません。")
    : new ThreadRepositoryError("unknown", "投稿を保存できませんでした。");
}

export async function getThreads(client: SupabaseClient<Database>, frameId: string) {
  const { data: frame, error: frameError } = await client
    .from("frames")
    .select("id")
    .eq("id", frameId)
    .eq("type", "question")
    .maybeSingle();
  if (frameError) throw new ThreadRepositoryError("unknown", "設問を確認できませんでした。");
  if (!frame) throw new ThreadRepositoryError("not_found", "指定された設問は見つかりません。");

  const { data, error } = await client
    .from("threads")
    .select("id, user_id, stance, title, created_at")
    .eq("frame_id", frameId)
    .eq("type", "user")
    .order("created_at", { ascending: false })
    .limit(threadLimit);
  if (error) throw new ThreadRepositoryError("unknown", "スレッドを取得できませんでした。");

  const authors = await getAuthors(client, data.map((thread) => thread.user_id));
  return data.map((thread): ThreadSummary => ({
    id: thread.id,
    title: thread.title,
    stance: thread.stance as PostStance,
    createdAt: thread.created_at,
    author: authorFor(authors, thread.user_id),
  }));
}

export async function createThread(
  client: SupabaseClient<Database>,
  frameId: string,
  userId: string,
  input: { title: string; body: string; stance: PostStance },
) {
  const { data, error } = await client
    .from("threads")
    .insert({
      frame_id: frameId,
      type: "user",
      user_id: userId,
      stance: input.stance,
      title: input.title,
      body: input.body,
    })
    .select("id")
    .single();
  if (error) throw mapWriteError(error);
  return { id: data.id };
}

export async function getThreadDetail(
  client: SupabaseClient<Database>,
  threadId: string,
): Promise<ThreadDetail> {
  const { data: thread, error: threadError } = await client
    .from("threads")
    .select("id, frame_id, user_id, stance, title, body, created_at")
    .eq("id", threadId)
    .eq("type", "user")
    .maybeSingle();
  if (threadError) throw new ThreadRepositoryError("unknown", "スレッドを取得できませんでした。");
  if (!thread) throw new ThreadRepositoryError("not_found", "指定されたスレッドは見つかりません。");

  const { data: comments, error: commentsError } = await client
    .from("comments")
    .select("id, user_id, stance, body, created_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .limit(commentLimit);
  if (commentsError) throw new ThreadRepositoryError("unknown", "コメントを取得できませんでした。");

  const authors = await getAuthors(client, [thread.user_id, ...comments.map((comment) => comment.user_id)]);
  return {
    id: thread.id,
    frameId: thread.frame_id,
    title: thread.title,
    body: thread.body,
    stance: thread.stance as PostStance,
    createdAt: thread.created_at,
    author: authorFor(authors, thread.user_id),
    comments: comments.reverse().map((comment) => ({
      id: comment.id,
      body: comment.body,
      stance: comment.stance,
      createdAt: comment.created_at,
      author: authorFor(authors, comment.user_id),
    })),
  };
}

export async function createComment(
  client: SupabaseClient<Database>,
  threadId: string,
  userId: string,
  input: { body: string; stance: PostStance | null },
) {
  const { data, error } = await client
    .from("comments")
    .insert({ thread_id: threadId, user_id: userId, body: input.body, stance: input.stance })
    .select("id")
    .single();
  if (error) throw mapWriteError(error);
  return { id: data.id };
}
