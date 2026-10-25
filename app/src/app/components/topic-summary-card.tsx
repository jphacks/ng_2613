import { useId, useRef, useState } from "react";
import type { TopicFrame } from "../lib/catalog/types";
import type { PostStance, ThreadSummary } from "../lib/threads/types";
import type { VoteValue } from "../lib/votes/types";
import InlineVote from "./inline-vote";
import VoteResultBar from "./vote-result-bar";
import { DictionaryText } from "./dictionary";
import "../screens/summary-screen.css";

type Props = {
  color?: string;
  questionNumber?: number;
  frame: TopicFrame;
  threads: ThreadSummary[];
  submitting: boolean;
  error: string;
  onVote: (frameId: string, value: VoteValue) => Promise<boolean>;
  onDetail?: () => void;
  onThread: (threadId: string) => void;
};
type Segment = { label: string; value: number; color: string };
const ageGroups: Segment[] = [
  { label: "10, 20代", value: 15, color: "#397fa8" },
  { label: "30代", value: 25, color: "#64aaca" },
  { label: "40代", value: 20, color: "#a8cedb" },
  { label: "50代", value: 18, color: "#8876a5" },
  { label: "60代", value: 12, color: "#bba9ce" },
  { label: "70代以上", value: 10, color: "#d8cce4" },
];
const genders: Segment[] = [
  { label: "男性", value: 50, color: "#a7daf5" },
  { label: "女性", value: 40, color: "#edaab8" },
  { label: "その他", value: 10, color: "#cfbded" },
];
function DemographicChart({ title, data }: { title: string; data: Segment[] }) {
  const stops = data.map((item, index) => {
    const start = data
      .slice(0, index)
      .reduce((sum, segment) => sum + segment.value, 0);
    return `${item.color} ${start}% ${start + item.value}%`;
  });
  return (
    <figure className="demographic-chart">
      <figcaption>{title}</figcaption>
      <div
        className="demographic-pie"
        role="img"
        aria-label={data
          .map((item) => `${item.label} ${item.value}%`)
          .join("、")}
        style={{ background: `conic-gradient(${stops.join(",")})` }}
      />
      <ul>
        {data.map((item) => (
          <li key={item.label}>
            <span className="chart-key" style={{ background: item.color }} />
            <span>{item.label}</span>
            <span>{item.value}%</span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
// 代表に選ばれた意見を順位の順に並べる。順位がない一覧（古い応答）なら、今までどおり先頭から
function representativesFor(threads: ThreadSummary[], stance: PostStance) {
  const list = threads.filter((thread) => thread.stance === stance);
  if (!list.some((thread) => thread.representativeRank != null)) return list;
  return list
    .filter((thread) => thread.representativeRank != null)
    .sort((a, b) => a.representativeRank! - b.representativeRank!);
}
export default function TopicSummaryCard({
  color = "cream",
  questionNumber = 1,
  frame,
  threads,
  submitting,
  error,
  onVote,
  onDetail,
  onThread,
}: Props) {
  const statsRef = useRef<HTMLDialogElement>(null);
  const statsTitleId = useId();
  // 投票できたら円グラフを描き直す。key を変えて作り直し、描くアニメーションを最初から流す
  const [drawCount, setDrawCount] = useState(0);
  const titleId = useId();
  const { vote } = frame;
  const agreeThreads = representativesFor(threads, "agree");
  const disagreeThreads = representativesFor(threads, "disagree");
  return (
    <article className={`summary-card ${color}`} aria-labelledby={titleId}>
      <div className="summary-heading">
        {/* 折り返した2行目以降が「Q1.」の下に入らないよう、番号と文を横に並べる */}
        <h1 id={titleId} className="question-heading">
          <span className="question-number">Q{questionNumber}.</span>
          <span><DictionaryText>{frame.question}</DictionaryText></span>
        </h1>
        {/* 回答者の構成（年代・性別）をモーダルで開くボタン */}
        <button
          type="button"
          className="summary-stats-toggle"
          aria-haspopup="dialog"
          aria-label="統計を見る"
          title="統計を見る"
          onClick={() => statsRef.current?.showModal()}
        >
          {/* 太い棒が3本並ぶ棒グラフ。中は塗らず輪郭だけ */}
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <rect x="2.4" y="9.4" width="3.6" height="6.6" rx="1" />
            <rect x="7.2" y="3.4" width="3.6" height="12.6" rx="1" />
            <rect x="12" y="6.4" width="3.6" height="9.6" rx="1" />
          </svg>
          <span aria-hidden="true">統計</span>
        </button>
      </div>
      {/* 投票ボタンとダイアログをやめ、質問のすぐ下で直接選べるようにする */}
      <InlineVote frame={frame} questionNumber={questionNumber} submitting={submitting} error={error} onVote={onVote} onVoted={() => setDrawCount((count) => count + 1)} />
      <div className="summary-content">
        {/* 投票結果の帯グラフ。投票できたら key を変えて作り直し、左から伸びるアニメーションを流す */}
        <VoteResultBar key={drawCount} vote={vote} drawing={drawCount > 0} />
        {/* 賛成・反対の代表意見を縦に積む。どちらも3行分の枠を取り、意見がない行は空けておく */}
        <div className="opinion-groups">
          {([
            { stance: "agree", label: "賛成", list: agreeThreads },
            { stance: "disagree", label: "反対", list: disagreeThreads },
          ] as const).map((group) => (
            <section key={group.stance} className={`opinion-group ${group.stance}`}>
              <h3>{group.label}</h3>
              <ul>
                {[0, 1, 2].map((row) => (
                  <li key={row}>
                    {group.list[row] && (
                      <button
                        aria-label={`議題${questionNumber}の${group.label}意見${row + 1}`}
                        onClick={() => onThread(group.list[row].id)}
                      >
                        <DictionaryText>{group.list[row].title}</DictionaryText>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
      <dialog
        ref={statsRef}
        className="summary-vote-dialog stats-dialog"
        aria-labelledby={statsTitleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) statsRef.current?.close();
        }}
      >
        <button type="button" className="vote-dialog-close" aria-label="統計を閉じる" onClick={() => statsRef.current?.close()}>
          ×
        </button>
        <p className="stats-dialog-question">Q{questionNumber}. {frame.question}</p>
        <h2 id={statsTitleId}>回答者の構成（デモデータ）</h2>
        <div className="demographic-charts">
          <DemographicChart title="回答者の年代" data={ageGroups} />
          <DemographicChart title="回答者の性別" data={genders} />
        </div>
      </dialog>
      {onDetail && (
        <button type="button" className="summary-opinions-link" onClick={onDetail}>
          みんなの意見をもっと見る！
          <span aria-hidden="true">›</span>
        </button>
      )}
    </article>
  );
}
