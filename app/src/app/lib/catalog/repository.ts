import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { Catalog, CatalogGenre, TopicDetail, TopicPeriod } from "./types";
import { getFrameVoteStates, VoteRepositoryError } from "../votes/repository.ts";

type GenreRow = Database["public"]["Tables"]["genres"]["Row"];
type MiddleTopicRow = Database["public"]["Tables"]["middle_topics"]["Row"];
type TopicRow = Database["public"]["Tables"]["topics"]["Row"];
type PeriodRow = Database["public"]["Tables"]["periods"]["Row"];
type FrameRow = Database["public"]["Tables"]["frames"]["Row"];

export class CatalogRepositoryError extends Error {}

function compareNullableOrder(
  left: { sort_order: number | null; name: string },
  right: { sort_order: number | null; name: string },
) {
  if (left.sort_order === null && right.sort_order !== null) return 1;
  if (left.sort_order !== null && right.sort_order === null) return -1;
  if (left.sort_order !== right.sort_order) {
    return (left.sort_order ?? 0) - (right.sort_order ?? 0);
  }
  return left.name.localeCompare(right.name, "ja");
}

export function buildCatalog(
  genres: GenreRow[],
  middleTopics: MiddleTopicRow[],
  topics: TopicRow[],
): Catalog {
  const topicsByMiddle = new Map<string, TopicRow[]>();
  for (const topic of topics) {
    const group = topicsByMiddle.get(topic.middle_topic_id) ?? [];
    group.push(topic);
    topicsByMiddle.set(topic.middle_topic_id, group);
  }

  const middleByGenre = new Map<string, MiddleTopicRow[]>();
  for (const middleTopic of middleTopics) {
    const group = middleByGenre.get(middleTopic.genre_id) ?? [];
    group.push(middleTopic);
    middleByGenre.set(middleTopic.genre_id, group);
  }

  const result: CatalogGenre[] = [...genres].sort(compareNullableOrder).map((genre) => ({
    id: genre.id,
    name: genre.name,
    description: genre.description,
    sortOrder: genre.sort_order,
    middleTopics: (middleByGenre.get(genre.id) ?? [])
      .sort(compareNullableOrder)
      .map((middleTopic) => ({
        id: middleTopic.id,
        name: middleTopic.name,
        description: middleTopic.description,
        sortOrder: middleTopic.sort_order,
        topics: (topicsByMiddle.get(middleTopic.id) ?? [])
          .filter((topic) => topic.status !== "hidden")
          .sort(compareNullableOrder)
          .map((topic) => ({
            id: topic.id,
            name: topic.name,
            description: topic.description,
            sortOrder: topic.sort_order,
            status: topic.status === "locked" ? "locked" : "open",
          })),
      })),
  }));

  return { genres: result };
}

export async function getCatalog(client: SupabaseClient<Database>): Promise<Catalog> {
  const [genresResult, middleTopicsResult, topicsResult] = await Promise.all([
    client.from("genres").select("id, name, description, sort_order, created_at"),
    client.from("middle_topics").select("id, genre_id, name, description, sort_order, created_at"),
    client.from("topics").select("id, middle_topic_id, name, description, sort_order, status, created_at"),
  ]);

  if (genresResult.error || middleTopicsResult.error || topicsResult.error) {
    throw new CatalogRepositoryError("分類データを取得できませんでした。");
  }

  return buildCatalog(genresResult.data, middleTopicsResult.data, topicsResult.data);
}

function buildPeriods(
  periods: PeriodRow[],
  frames: FrameRow[],
  voteStates: Awaited<ReturnType<typeof getFrameVoteStates>>,
  topicStatus: TopicRow["status"],
): TopicPeriod[] {
  const framesByPeriod = new Map<string, FrameRow[]>();
  for (const frame of frames) {
    const group = framesByPeriod.get(frame.period_id) ?? [];
    group.push(frame);
    framesByPeriod.set(frame.period_id, group);
  }

  return [...periods]
    .sort((left, right) => right.start_date.localeCompare(left.start_date))
    .map((period) => ({
      id: period.id,
      code: period.code,
      startDate: period.start_date,
      endDate: period.end_date,
      status: period.status,
      frames: (framesByPeriod.get(period.id) ?? [])
        .filter((frame): frame is FrameRow & { question: string } => frame.question !== null)
        .sort((left, right) => {
          if (left.sort_order === null && right.sort_order !== null) return 1;
          if (left.sort_order !== null && right.sort_order === null) return -1;
          return (left.sort_order ?? 0) - (right.sort_order ?? 0);
        })
        .map((frame) => ({
          id: frame.id,
          question: frame.question,
          sortOrder: frame.sort_order,
          vote: {
            ...(voteStates.get(frame.id) ?? {
              counts: [0, 0, 0, 0, 0] as [number, number, number, number, number],
              totalCount: 0,
              myValue: null,
              canChange: true,
              canChangeAt: null,
            }),
            votingOpen:
              topicStatus === "open"
              && period.status === "active"
              && period.start_date <= new Date().toISOString().slice(0, 10)
              && new Date().toISOString().slice(0, 10) <= period.end_date,
          },
        })),
    }));
}

export async function getTopicDetail(
  client: SupabaseClient<Database>,
  topicId: string,
  userId: string,
): Promise<TopicDetail | null> {
  const { data: topic, error: topicError } = await client
    .from("topics")
    .select("id, middle_topic_id, name, description, sort_order, status, created_at")
    .eq("id", topicId)
    .maybeSingle();

  if (topicError) throw new CatalogRepositoryError("トピックを取得できませんでした。");
  if (!topic) return null;

  const { data: middleTopic, error: middleError } = await client
    .from("middle_topics")
    .select("id, genre_id, name, description, sort_order, created_at")
    .eq("id", topic.middle_topic_id)
    .single();

  if (middleError) throw new CatalogRepositoryError("中分類を取得できませんでした。");

  const [genreResult, framesResult] = await Promise.all([
    client
      .from("genres")
      .select("id, name, description, sort_order, created_at")
      .eq("id", middleTopic.genre_id)
      .single(),
    client
      .from("frames")
      .select("id, topic_id, period_id, type, question, sort_order, created_at")
      .eq("topic_id", topic.id)
      .eq("type", "question"),
  ]);

  if (genreResult.error || framesResult.error) {
    throw new CatalogRepositoryError("トピックの関連データを取得できませんでした。");
  }

  const periodIds = [...new Set(framesResult.data.map((frame) => frame.period_id))];
  let periods: PeriodRow[] = [];
  if (periodIds.length > 0) {
    const periodsResult = await client
      .from("periods")
      .select("id, code, start_date, end_date, status, created_at")
      .in("id", periodIds);
    if (periodsResult.error) {
      throw new CatalogRepositoryError("設問の期間を取得できませんでした。");
    }
    periods = periodsResult.data;
  }

  let voteStates: Awaited<ReturnType<typeof getFrameVoteStates>>;
  try {
    voteStates = await getFrameVoteStates(
      client,
      framesResult.data.map((frame) => frame.id),
      userId,
    );
  } catch (error) {
    if (error instanceof VoteRepositoryError) {
      throw new CatalogRepositoryError(error.message);
    }
    throw error;
  }

  return {
    id: topic.id,
    name: topic.name,
    description: topic.description,
    status: topic.status === "locked" ? "locked" : "open",
    middleTopic: {
      id: middleTopic.id,
      name: middleTopic.name,
      genre: { id: genreResult.data.id, name: genreResult.data.name },
    },
    periods: buildPeriods(periods, framesResult.data, voteStates, topic.status),
  };
}
