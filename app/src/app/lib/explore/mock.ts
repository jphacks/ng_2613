import type { CatalogGenre, CatalogTopic } from "../catalog/types";

// 探索の地図の枝。AI チャットで話したことから分かれ、それぞれにおすすめの問いがつながる
export type ExploreBranch = {
  label: string;
  topics: CatalogTopic[];
};

// 画面の確認用のモック。AI チャットの中身は見ず、決まった話題と枝を出す
export const exploreChatSummary = "消費税の経済的なデメリットが気になる";

const branchWords = [
  { label: "景気への影響", words: ["景気", "経済", "税", "物価", "賃金", "財政"] },
  { label: "家計への負担", words: ["社会保障", "年金", "子育て", "医療", "生活", "給付", "教育"] },
];

const topicsPerBranch = 2;

// 枝ごとに、言葉が名前に含まれるトピックを先に選ぶ。足りなければ残りのトピックで埋める
export function mockExploreBranches(genres: CatalogGenre[]): ExploreBranch[] {
  const allTopics = genres.flatMap((genre) => genre.middleTopics.flatMap((middleTopic) => middleTopic.topics));
  const used = new Set<string>();
  const branches = branchWords.map(({ label, words }) => {
    const topics = allTopics
      .filter((topic) => !used.has(topic.id) && words.some((word) => topic.name.includes(word)))
      .slice(0, topicsPerBranch);
    topics.forEach((topic) => used.add(topic.id));
    return { label, topics };
  });
  const rest = allTopics.filter((topic) => !used.has(topic.id));
  return branches.map((branch) => ({
    ...branch,
    topics: [...branch.topics, ...rest.splice(0, topicsPerBranch - branch.topics.length)],
  }));
}
