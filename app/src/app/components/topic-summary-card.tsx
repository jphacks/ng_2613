import { useEffect, useId, useRef, useState } from "react";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { TopicFrame } from "../lib/catalog/types";
import type { ThreadSummary } from "../lib/threads/types";
import type { VoteValue } from "../lib/votes/types";
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
  const [expanded, setExpanded] = useState(false);
  const [voteCompleted, setVoteCompleted] = useState(false);
  const detailsId = useId();
  const titleId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { vote } = frame;
  const hasVoted = vote.myValue !== null;
  // 5段階のうち「やや賛成」「賛成」を賛成、「反対」「やや反対」を反対として二分する。
  const agreeCount = vote.counts[3] + vote.counts[4];
  const disagreeCount = vote.counts[0] + vote.counts[1];
  const stanceTotal = agreeCount + disagreeCount;
  const agreePercent = stanceTotal ? Math.round((agreeCount / stanceTotal) * 100) : 0;
  const disagreePercent = stanceTotal ? 100 - agreePercent : 0;
  const agreeThreads = threads.filter((thread) => thread.stance === "agree");
  const disagreeThreads = threads.filter((thread) => thread.stance === "disagree");
  const changeLocked = vote.myValue !== null && !vote.canChange;
  const voteDisabled = submitting || !vote.votingOpen || changeLocked;
  useEffect(() => {
    if (!voteCompleted || submitting || vote.myValue === null) return;
    const timeoutId = window.setTimeout(() => dialogRef.current?.close(), 1000);
    return () => window.clearTimeout(timeoutId);
  }, [voteCompleted, submitting, vote.myValue]);
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
        <h1 id={titleId}>Q{questionNumber}. {frame.question}</h1>
        <div className="summary-buttons">
          <button
            className="summary-vote"
            onClick={() => dialogRef.current?.showModal()}
          >
            投票
          </button>
          {onDetail && (
            <button
              className="summary-detail"
              onClick={onDetail}
            >
              議論
            </button>
          )}
        </div>
      </div>
      <div className="summary-content">
        <div
          className="pie"
          role="img"
          aria-label={hasVoted ? `賛成${agreePercent}%、反対${disagreePercent}%` : "投票してください"}
          style={!hasVoted ? { background: "#d9d9d9" } : stanceTotal ? {
            background: `linear-gradient(to right,var(--blue) ${agreePercent}%,var(--pink) ${agreePercent}%)`,
          } : undefined}
        >
          {hasVoted ? (
            <>
              <span>
                賛成
                <br />
                {agreePercent}%
              </span>
              <span>
                反対
                <br />
                {disagreePercent}%
              </span>
            </>
          ) : (
            <span>投票してください</span>
          )}
        </div>
        <table>
          <thead>
            <tr>
              <th>賛成</th>
              <th>反対</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((row) => (
              <tr key={row}>
                <td>
                  {agreeThreads[row] && (
                    <button
                      aria-label={`議題${questionNumber}の賛成意見${row + 1}`}
                      onClick={() => onThread(agreeThreads[row].id)}
                    >
                      {agreeThreads[row].title}
                    </button>
                  )}
                </td>
                <td>
                  {disagreeThreads[row] && (
                    <button
                      aria-label={`議題${questionNumber}の反対意見${row + 1}`}
                      onClick={() => onThread(disagreeThreads[row].id)}
                    >
                      {disagreeThreads[row].title}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div id={detailsId} hidden={!expanded}>
        <p className="demographic-note">回答者の構成（デモデータ）</p>
        <div className="demographic-charts">
          <DemographicChart title="回答者の年代" data={ageGroups} />
          <DemographicChart title="回答者の性別" data={genders} />
        </div>
      </div>
      <button
        className="summary-toggle"
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "閉じる △" : "もっと見る ▽"}
      </button>
      <dialog
        ref={dialogRef}
        className="summary-vote-dialog"
        aria-labelledby={dialogTitleId}
        onClose={() => setVoteCompleted(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) dialogRef.current?.close();
        }}
      >
        <button
          className="vote-dialog-close"
          aria-label="投票ダイアログを閉じる"
          onClick={() => dialogRef.current?.close()}
        >
          ×
        </button>
        <h2 id={dialogTitleId}>Q{questionNumber}. {frame.question}</h2>
        <div className="dialog-vote-labels">
          <span>反対</span>
          <span>賛成</span>
        </div>
        <div className="dialog-vote-options">
          {[0, 1, 2, 3, 4].map((index) => (
            <button
              key={index}
              className="dialog-vote-dot"
              aria-label={opinionLabels[index]}
              aria-pressed={vote.myValue === index + 1}
              disabled={voteDisabled}
              style={{ background: opinionColors[index] }}
              onClick={async () => {
                if (await onVote(frame.id, (index + 1) as VoteValue)) {
                  setVoteCompleted(true);
                }
              }}
            />
          ))}
        </div>
        <p className="dialog-vote-status" role="status">
          {voteStatus()}
        </p>
      </dialog>
    </article>
  );
}
