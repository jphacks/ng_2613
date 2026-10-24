export type VoteValue = 1 | 2 | 3 | 4 | 5;

export type FrameVoteState = {
  counts: [number, number, number, number, number];
  totalCount: number;
  myValue: VoteValue | null;
  canChange: boolean;
  canChangeAt: string | null;
  votingOpen: boolean;
};
