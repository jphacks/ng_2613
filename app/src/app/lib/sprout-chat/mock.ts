import type { ThreadSummary } from "../threads/types";

// AI との対話の1件分。AI の発言には、根拠にした実際の投稿を付けられる
export type SproutChatMessage = {
  id: number;
  from: "ai" | "user";
  text: string;
  threadIds?: string[];
};

type SproutReply = Omit<SproutChatMessage, "id">[];

export const sproutChatGreeting = "この設問について、なんとなく思っていることを教えてください。まとまっていなくて大丈夫です。";

// 経済的なデメリットの話で、根拠として先に挙げたい意見に含まれる言葉
const economicWords = ["景気", "消費", "負担", "家計", "所得", "収入", "物価", "値上", "生活", "経済", "中小"];

// 指定した立場の意見を、言葉が多く含まれる順に選ぶ（言葉がなければ投稿の順）
function pickThreads(threads: ThreadSummary[], stance: ThreadSummary["stance"], words: string[], count: number) {
  return threads
    .filter((thread) => thread.stance === stance)
    .map((thread, index) => ({ thread, index, score: words.filter((word) => thread.title.includes(word)).length }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, count)
    .map(({ thread }) => thread.id);
}

// 「メリットは分かるけど、経済的なデメリットは？」のような問いへの答え
function economicDemeritReply(threads: ThreadSummary[]): SproutReply {
  return [
    { from: "ai", text: "メリットは分かっていて、経済への悪い影響が気になっているんですね。消費税を上げることの経済的なデメリットとしては、主にこんな点が挙げられます。" },
    {
      from: "ai",
      text: "・買い物を控える人が増えて、景気が冷え込みやすい（上がる前の駆け込み買いと、そのあとの落ち込みも起きやすい）\n"
        + "・収入の少ない人ほど、収入に対する負担の割合が大きくなる（逆進性）\n"
        + "・値上げを価格に上乗せしにくい中小のお店ほど、利益が削られやすい",
    },
    { from: "ai", text: "反対の立場からは、こんな意見が出ています。", threadIds: pickThreads(threads, "disagree", economicWords, 2) },
    { from: "ai", text: "あなたが一番気になるのは、景気への影響と、家計への負担のどちらに近いですか？" },
  ];
}

// 画面の確認用のモック。AI は呼ばず、入力の言葉と何回目の発言かで決まった答えを返す
export function mockSproutReply(text: string, turn: number, threads: ThreadSummary[]): SproutReply {
  if (/デメリット|でめりっと|悪い|問題|経済/.test(text)) return economicDemeritReply(threads);
  const agree = threads.filter((thread) => thread.stance === "agree").map((thread) => thread.id);
  const disagree = threads.filter((thread) => thread.stance === "disagree").map((thread) => thread.id);
  if (turn === 0) {
    return [
      { from: "ai", text: "負担が増えることへの不安と、制度を支えたい気持ちの両方を持っているようですね。" },
      { from: "ai", text: "賛成の人からは「今の負担を避けると、将来の世代に回る」という意見が出ています。", threadIds: agree.slice(0, 2) },
      { from: "ai", text: "反対の人からは「収入の少ない人ほど負担の割合が大きくなる」という意見が出ています。", threadIds: disagree.slice(0, 2) },
      { from: "ai", text: "あなたにとって、一番守りたいものは何ですか？" },
    ];
  }
  if (turn === 1) {
    return [
      { from: "ai", text: "なるほど。集めたお金の使い道が見えれば納得できる、という声もあります。", threadIds: [...agree.slice(2, 3), ...disagree.slice(2, 3)] },
      { from: "ai", text: "負担が増えるとしたら、どんな条件なら受け入れられそうですか？" },
    ];
  }
  return [{ from: "ai", text: "考えが少し見えてきましたね。気になった意見を開いて、読んでみてください。" }];
}
