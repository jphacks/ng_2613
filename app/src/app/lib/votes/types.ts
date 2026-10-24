export type VoteValue = 1 | 2 | 3 | 4 | 5;

export type FrameVoteState = {
  counts: [number, number, number, number, number];
  totalCount: number;
  myValue: VoteValue | null;
  canChange: boolean;
  canChangeAt: string | null;
  votingOpen: boolean;
};

export type AgeBucket = "10s_20s" | "30s" | "40s" | "50s" | "60s" | "70s_plus" | "unknown" | "hidden";
export type GenderBucket = "男性" | "女性" | "その他" | "unknown" | "hidden";

// 投票者の年代・性別の内訳。少人数で投票者を推測できないよう、
// 投票者が5人未満のあいだは available が false で内訳は空になる。
// 5人未満の区分は hidden にまとめて返る（DB 関数側で処理）。
export type FrameVoteDemographics = {
  available: boolean;
  ages: { bucket: AgeBucket; count: number }[];
  genders: { bucket: GenderBucket; count: number }[];
};
