import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { getFrameVoteStates, VoteRepositoryError } from "../votes/repository.ts";
import type { DailyTheme } from "./types";

const videoBucket = "videos";

export class DailyThemeRepositoryError extends Error {}

export function getDateInTokyo(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function getTokyoDayRange(date = new Date()) {
  const day = getDateInTokyo(date);
  const start = new Date(`${day}T00:00:00+09:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start: start.toISOString(), end: end.toISOString(), day };
}

export function getStoragePath(value: string) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/videos\/(.+)$/);
    if (match) return decodeURIComponent(match[1]);
  } catch {
    // A plain object path is also supported.
  }

  const normalized = value.replace(/^\/+/, "");
  return normalized.startsWith(`${videoBucket}/`)
    ? normalized.slice(videoBucket.length + 1)
    : normalized;
}

function getPlaybackUrl(client: SupabaseClient<Database>, value: string) {
  if (/^https?:\/\//i.test(value)) return value;
  return client.storage.from(videoBucket).getPublicUrl(getStoragePath(value)).data.publicUrl;
}

export async function getDailyTheme(
  client: SupabaseClient<Database>,
  userId: string,
  now = new Date(),
): Promise<DailyTheme | null> {
  const { start, end, day } = getTokyoDayRange(now);
  const { data: video, error: videoError } = await client
    .from("videos")
    .select("id, title, description, url, published_at, source_thread_id, created_at")
    .gte("published_at", start)
    .lt("published_at", end)
    .lte("published_at", now.toISOString())
    .maybeSingle();

  if (videoError) throw new DailyThemeRepositoryError("今日のテーマを取得できませんでした。");
  if (!video?.published_at) return null;

  const { data: relation, error: relationError } = await client
    .from("video_questions")
    .select("video_id, frame_id, created_at")
    .eq("video_id", video.id)
    .maybeSingle();
  if (relationError) throw new DailyThemeRepositoryError("今日の動画に対応する設問を取得できませんでした。");
  if (!relation) return null;

  const { data: frame, error: frameError } = await client
    .from("frames")
    .select("id, topic_id, period_id, type, question, sort_order, created_at")
    .eq("id", relation.frame_id)
    .eq("type", "question")
    .maybeSingle();
  if (frameError) throw new DailyThemeRepositoryError("今日の設問を取得できませんでした。");
  if (!frame?.question) return null;

  const { data: topic, error: topicError } = await client
    .from("topics")
    .select("id, middle_topic_id, name, description, sort_order, status, created_at")
    .eq("id", frame.topic_id)
    .neq("status", "hidden")
    .maybeSingle();
  if (topicError) throw new DailyThemeRepositoryError("今日の設問の分類を取得できませんでした。");
  if (!topic) return null;

  const { data: middleTopic, error: middleTopicError } = await client
    .from("middle_topics")
    .select("id, genre_id, name, description, sort_order, created_at")
    .eq("id", topic.middle_topic_id)
    .maybeSingle();
  if (middleTopicError || !middleTopic) {
    throw new DailyThemeRepositoryError("今日の設問の分類を取得できませんでした。");
  }

  const { data: period, error: periodError } = await client
    .from("periods")
    .select("id, code, start_date, end_date, status, created_at")
    .eq("id", frame.period_id)
    .maybeSingle();
  if (periodError || !period) {
    throw new DailyThemeRepositoryError("今日の設問の投票期間を取得できませんでした。");
  }

  let voteState;
  try {
    voteState = (await getFrameVoteStates(client, [frame.id], userId)).get(frame.id);
  } catch (error) {
    if (error instanceof VoteRepositoryError) {
      throw new DailyThemeRepositoryError(error.message);
    }
    throw error;
  }

  const votingOpen = topic.status === "open"
    && period.status === "active"
    && period.start_date <= day
    && day <= period.end_date;

  return {
    id: video.id,
    title: video.title,
    description: video.description,
    playbackUrl: getPlaybackUrl(client, video.url),
    publishedAt: video.published_at,
    frame: {
      id: frame.id,
      question: frame.question,
      topicId: topic.id,
      middleTopicId: middleTopic.id,
      genreId: middleTopic.genre_id,
      vote: {
        ...(voteState ?? {
          counts: [0, 0, 0, 0, 0],
          totalCount: 0,
          myValue: null,
          canChange: true,
          canChangeAt: null,
        }),
        votingOpen,
      },
    },
  };
}
