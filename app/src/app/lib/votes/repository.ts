import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import type { AgeBucket, FrameVoteDemographics, FrameVoteState, GenderBucket, VoteValue } from "./types";

const changeIntervalMilliseconds = 7 * 24 * 60 * 60 * 1000;

export class VoteRepositoryError extends Error {
  readonly kind: "cooldown" | "closed" | "conflict" | "unknown";

  constructor(
    kind: "cooldown" | "closed" | "conflict" | "unknown",
    message: string,
  ) {
    super(message);
    this.kind = kind;
  }
}

function nextChangeAt(updatedAt: string) {
  return new Date(new Date(updatedAt).getTime() + changeIntervalMilliseconds).toISOString();
}

function mapVoteError(error: { code?: string; message?: string }) {
  if (error.message?.includes("seven days")) {
    return new VoteRepositoryError("cooldown", "投票は前回の投票から7日後に変更できます。");
  }
  if (error.code === "23514" || error.code === "42501") {
    return new VoteRepositoryError("closed", "この設問は現在投票を受け付けていません。");
  }
  if (error.code === "23505") {
    return new VoteRepositoryError("conflict", "投票が競合しました。もう一度お試しください。");
  }
  return new VoteRepositoryError("unknown", "投票を保存できませんでした。");
}

export async function getFrameVoteStates(
  client: SupabaseClient<Database>,
  frameIds: string[],
  userId: string,
) {
  const states = new Map<string, Omit<FrameVoteState, "votingOpen">>();
  if (frameIds.length === 0) return states;

  const [ownVotesResult, ...countResults] = await Promise.all([
    client
      .from("votes")
      .select("frame_id, value, updated_at")
      .eq("user_id", userId)
      .in("frame_id", frameIds),
    ...frameIds.map((frameId) =>
      client.rpc("get_frame_vote_counts", { target_frame_id: frameId }),
    ),
  ]);

  if (ownVotesResult.error || countResults.some((result) => result.error)) {
    throw new VoteRepositoryError("unknown", "投票結果を取得できませんでした。");
  }

  const ownVotes = new Map(
    ownVotesResult.data.map((vote) => [vote.frame_id, vote]),
  );

  frameIds.forEach((frameId, index) => {
    const counts = countResults[index].data?.[0];
    const ownVote = ownVotes.get(frameId);
    const canChangeAt = ownVote ? nextChangeAt(ownVote.updated_at) : null;
    states.set(frameId, {
      counts: [
        Number(counts?.count_1 ?? 0),
        Number(counts?.count_2 ?? 0),
        Number(counts?.count_3 ?? 0),
        Number(counts?.count_4 ?? 0),
        Number(counts?.count_5 ?? 0),
      ],
      totalCount: Number(counts?.total_count ?? 0),
      myValue: ownVote ? ownVote.value as VoteValue : null,
      canChange: !canChangeAt || Date.now() >= new Date(canChangeAt).getTime(),
      canChangeAt,
    });
  });

  return states;
}

export async function saveVote(
  client: SupabaseClient<Database>,
  frameId: string,
  userId: string,
  value: VoteValue,
) {
  const { data: existingVote, error: existingError } = await client
    .from("votes")
    .select("id")
    .eq("frame_id", frameId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existingError) throw mapVoteError(existingError);

  const result = existingVote
    ? await client.from("votes").update({ value }).eq("id", existingVote.id)
    : await client.from("votes").insert({ frame_id: frameId, user_id: userId, value });

  if (result.error) throw mapVoteError(result.error);

  const states = await getFrameVoteStates(client, [frameId], userId);
  const state = states.get(frameId);
  if (!state) throw new VoteRepositoryError("unknown", "投票結果を取得できませんでした。");
  return { ...state, votingOpen: true } satisfies FrameVoteState;
}

const ageBuckets: AgeBucket[] = ["10s_20s", "30s", "40s", "50s", "60s", "70s_plus", "unknown", "hidden"];
const genderBuckets: GenderBucket[] = ["男性", "女性", "その他", "unknown", "hidden"];

export class DemographicsUnavailableError extends Error {}

export async function getFrameVoteDemographics(
  client: SupabaseClient<Database>,
  frameId: string,
): Promise<FrameVoteDemographics> {
  const { data, error } = await client.rpc("get_frame_vote_demographics", { target_frame_id: frameId });
  if (error) {
    // migration を反映する前は関数が存在しない（PostgREST の PGRST202）
    if (error.code === "PGRST202") {
      throw new DemographicsUnavailableError("年代・性別の集計はまだ利用できません。");
    }
    throw new VoteRepositoryError("unknown", "年代・性別の集計を取得できませんでした。");
  }

  const countOf = (category: string, bucket: string) =>
    Number(data.find((row) => row.category === category && row.bucket === bucket)?.voter_count ?? 0);
  return {
    available: data.length > 0,
    ages: data.length > 0 ? ageBuckets.map((bucket) => ({ bucket, count: countOf("age", bucket) })) : [],
    genders: data.length > 0 ? genderBuckets.map((bucket) => ({ bucket, count: countOf("gender", bucket) })) : [],
  };
}
