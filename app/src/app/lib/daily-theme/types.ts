import type { FrameVoteState } from "../votes/types";

export type DailyTheme = {
  id: string;
  title: string;
  description: string | null;
  playbackUrl: string;
  publishedAt: string;
  frame: {
    id: string;
    question: string;
    topicId: string;
    middleTopicId: string;
    genreId: string;
    vote: FrameVoteState;
  };
};

