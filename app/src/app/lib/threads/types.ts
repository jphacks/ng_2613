export type PostStance = "agree" | "disagree";

export type PostAuthor = {
  id: string;
  username: string;
};

export type ThreadSummary = {
  id: string;
  title: string;
  stance: PostStance;
  createdAt: string;
  author: PostAuthor;
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
