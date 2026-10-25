import { useId, useRef, useState } from "react";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { TopicFrame } from "../lib/catalog/types";
import type { ThreadSummary } from "../lib/threads/types";
import type { VoteValue } from "../lib/votes/types";
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
function formatChangeDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
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
  // 丸を押したらすぐ投票せず、確認のモーダルを出す。投票後7日間は変更できないため
  const [pendingValue, setPendingValue] = useState<VoteValue | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  // 投票できたら円グラフを描き直す。key を変えて作り直し、描くアニメーションを最初から流す
  const [drawCount, setDrawCount] = useState(0);
  const titleId = useId();
  const confirmTitleId = useId();
  const { vote } = frame;
  const agreeThreads = threads.filter((thread) => thread.stance === "agree");
  const disagreeThreads = threads.filter((thread) => thread.stance === "disagree");
  const changeLocked = vote.myValue !== null && !vote.canChange;
  const voteDisabled = submitting || !vote.votingOpen || changeLocked;
  function voteStatus() {
    if (submitting) return "送信中…";
    if (error) return error;
    if (!vote.votingOpen) return "この設問は投票を受け付けていません";
    if (changeLocked && vote.canChangeAt) {
      return `「${opinionLabels[vote.myValue! - 1]}」に投票済み（${formatChangeDate(vote.canChangeAt)} 変更可能）`;
    }
    if (vote.myValue !== null) return `「${opinionLabels[vote.myValue - 1]}」に投票しました`;
    return "あなたの意見を選んでください";
  }
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
      <div className="summary-inline-vote" role="group" aria-label={`Q${questionNumber}への投票`}>
        {/* 反対・賛成は丸の並びの左右に置く */}
        <div className="inline-vote-row">
          <span className="inline-vote-label disagree" aria-hidden="true">反対</span>
          <div className="dialog-vote-options">
          {[0, 1, 2, 3, 4].map((index) => (
            <button
              key={index}
              className="dialog-vote-dot"
              aria-label={opinionLabels[index]}
              aria-pressed={vote.myValue === index + 1}
              disabled={voteDisabled}
              style={{ background: opinionColors[index] }}
              onClick={() => {
                setPendingValue((index + 1) as VoteValue);
                confirmRef.current?.showModal();
              }}
            />
          ))}
          </div>
          <span className="inline-vote-label agree" aria-hidden="true">賛成</span>
        </div>
        <p className="dialog-vote-status" role="status">
          {voteStatus()}
        </p>
      </div>
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
      <dialog
        ref={confirmRef}
        className="summary-vote-dialog vote-confirm"
        aria-labelledby={confirmTitleId}
        onClose={() => setPendingValue(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget && !submitting) confirmRef.current?.close();
        }}
      >
        {pendingValue !== null && (
          <>
            <p className="vote-confirm-question">Q{questionNumber}. {frame.question}</p>
            <p className="vote-confirm-choice">
              <span className="vote-confirm-dot" style={{ background: opinionColors[pendingValue - 1] }} aria-hidden="true" />
              {opinionLabels[pendingValue - 1]}
            </p>
            <h2 id={confirmTitleId}>この内容で投票しますか？</h2>
            <p className="vote-confirm-note">投票すると7日間は変更できません。</p>
            {error && <p className="vote-confirm-error" role="alert">{error}</p>}
            <div className="vote-confirm-actions">
              <button type="button" className="secondary" disabled={submitting} onClick={() => confirmRef.current?.close()}>
                キャンセル
              </button>
              <button
                type="button"
                className="primary"
                disabled={submitting}
                onClick={async () => {
                  if (await onVote(frame.id, pendingValue)) {
                    setDrawCount((count) => count + 1);
                    confirmRef.current?.close();
                  }
                }}
              >
                {submitting ? "送信中…" : "投票する"}
              </button>
            </div>
          </>
        )}
      </dialog>
    </article>
  );
}
