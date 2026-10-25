export type PostStance = "agree" | "disagree";

export type PostAuthor = {
  id: string;
  username: string;
};

export type ThreadSummary = {
  reacted?: boolean;
  id: string;
  title: string;
  stance: PostStance;
  createdAt: string;
  author: PostAuthor;
  // 設問カードに出す代表意見の順位（賛成・反対それぞれ 1〜3）。代表でなければ null
  representativeRank?: number | null;
};

export type ThreadComment = {
  id: string;
  body: string;
  stance: PostStance | null;
  createdAt: string;
  author: PostAuthor;
};

export type ThreadDetail = ThreadSummary & {
  frameId: string;
  body: string;
  comments: ThreadComment[];
};
