// 自分の投票から見えてくる、大事にしている信条と考えが近い政党の提案
export type InsightRank = {
  name: string;
  // どのくらい当てはまるか（0〜100）
  score: number;
  description: string;
  // そう判断した投票の例
  reasons: string[];
};

export type Insights = {
  voteCount: number;
  values: InsightRank[];
  parties: InsightRank[];
};

// 画面の確認用のモック。実際の投票は見ず、決まった結果を返す。
// 政党は特定の党をすすめていると受け取られないよう、仮の名前にしている
export const mockInsights: Insights = {
  voteCount: 12,
  values: [
    {
      name: "将来世代への責任",
      score: 86,
      description: "今の負担を少し増やしてでも、次の世代に借金や問題を残さないことを大事にしています。",
      reasons: ["「消費税を引き上げるべきか」に やや賛成", "「年金の支給開始を遅らせるべきか」に 賛成"],
    },
    {
      name: "負担の公平さ",
      score: 74,
      description: "収入の少ない人ほど苦しくならないよう、負担の分け方に気を配っています。",
      reasons: ["「食料品の税率を下げるべきか」に 賛成", "「所得の多い人の税率を上げるべきか」に やや賛成"],
    },
    {
      name: "経済の成長",
      score: 58,
      description: "景気や働く人の収入が伸びることも、同じくらい大切だと考えています。",
      reasons: ["「最低賃金を大きく引き上げるべきか」に どちらでもない"],
    },
  ],
  parties: [
    {
      name: "A党（仮）",
      score: 81,
      description: "財政の立て直しと、社会保障を続けることを重く見ています。",
      reasons: ["税と社会保障の設問 5問中4問で近い考え"],
    },
    {
      name: "B党（仮）",
      score: 66,
      description: "低所得の人への支援と、負担の公平さを重く見ています。",
      reasons: ["子育て・福祉の設問 4問中3問で近い考え"],
    },
    {
      name: "C党（仮）",
      score: 49,
      description: "減税で景気を良くすることを重く見ています。",
      reasons: ["経済の設問 3問中2問で近い考え"],
    },
  ],
};
