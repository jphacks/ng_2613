import { useId, useRef, useState } from "react";
import type { DemographicsState } from "../hooks/use-discussion-state";
import type { TopicFrame } from "../lib/catalog/types";
import type { ThreadSummary } from "../lib/threads/types";
import type { AgeBucket, GenderBucket, VoteValue } from "../lib/votes/types";
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
  demographics?: DemographicsState;
  onLoadDemographics: (frameId: string) => void;
};
type Segment = { label: string; value: number; color: string };
const unknownStyle = { label: "未回答", color: "#d9d9d9" };
const hiddenStyle = { label: "少人数のため非表示", color: "#b5b5b5" };
const ageStyles: Record<AgeBucket, { label: string; color: string }> = {
  "10s_20s": { label: "10, 20代", color: "#397fa8" },
  "30s": { label: "30代", color: "#64aaca" },
  "40s": { label: "40代", color: "#a8cedb" },
  "50s": { label: "50代", color: "#8876a5" },
  "60s": { label: "60代", color: "#bba9ce" },
  "70s_plus": { label: "70代以上", color: "#d8cce4" },
  unknown: unknownStyle,
  hidden: hiddenStyle,
};
const genderStyles: Record<GenderBucket, { label: string; color: string }> = {
  "男性": { label: "男性", color: "#a7daf5" },
  "女性": { label: "女性", color: "#edaab8" },
  "その他": { label: "その他", color: "#cfbded" },
  unknown: unknownStyle,
  hidden: hiddenStyle,
};
// 人数を割合にする。四捨五入だけだと合計が100%にならないため、端数の大きい順に1%ずつ配る。
function toSegments<T extends string>(
  rows: { bucket: T; count: number }[],
  styles: Record<T, { label: string; color: string }>,
): Segment[] {
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return [];
  const exact = rows.map((row) => (row.count / total) * 100);
  const percents = exact.map(Math.floor);
  let rest = 100 - percents.reduce((sum, value) => sum + value, 0);
  exact
    .map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction)
    .forEach(({ index }) => {
      if (rest > 0) {
        percents[index] += 1;
        rest -= 1;
      }
    });
  return rows
    .map((row, index) => ({ ...styles[row.bucket], value: percents[index], bucket: row.bucket, count: row.count }))
    // DB が返した区分だけを出す。少人数で「非表示」にまとめた区分を0%と見せると
    // 「その区分の投票者はいない」と誤解させるため。
    .filter((segment) => segment.count > 0)
    .map(({ label, value, color }) => ({ label, value, color }));
}
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
  demographics,
  onLoadDemographics,
}: Props) {
  const statsRef = useRef<HTMLDialogElement>(null);
  const statsTitleId = useId();
  // 投票できたら円グラフを描き直す。key を変えて作り直し、描くアニメーションを最初から流す
  const [drawCount, setDrawCount] = useState(0);
  const titleId = useId();
  const { vote } = frame;
  const agreeThreads = threads.filter((thread) => thread.stance === "agree");
  const disagreeThreads = threads.filter((thread) => thread.stance === "disagree");
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
          onClick={() => {
            statsRef.current?.showModal();
            // 開いたとき、まだ読んでいないか投票で集計が破棄されていれば取り直す
            if (!demographics) onLoadDemographics(frame.id);
          }}
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
        <h2 id={statsTitleId}>回答者の構成</h2>
        {demographics?.status === "success" && demographics.data.available ? (
          <div className="demographic-charts">
            <DemographicChart title="回答者の年代" data={toSegments(demographics.data.ages, ageStyles)} />
            <DemographicChart title="回答者の性別" data={toSegments(demographics.data.genders, genderStyles)} />
          </div>
        ) : (
          <p className="demographic-status" role="status">
            {!demographics || demographics.status === "loading"
              ? "集計中…"
              : demographics.status === "unavailable"
                ? "年代・性別の集計はまだ利用できません"
                : demographics.status === "error"
                  ? "集計を取得できませんでした"
                  : "回答が5人以上になると表示されます"}
          </p>
        )}
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
