import { useEffect, useId, useRef, useState } from "react";
import type { DemographicsState } from "../hooks/use-discussion-state";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { TopicFrame } from "../lib/catalog/types";
import type { ThreadSummary } from "../lib/threads/types";
import type { AgeBucket, GenderBucket, VoteValue } from "../lib/votes/types";
import "../screens/summary-screen.css";

type Props = {
  color?: string;
  questionNumber?: number;
  frame: TopicFrame;
  threads: ThreadSummary[];
  submitting: boolean;
  error: string;
  onVote: (frameId: string, value: VoteValue) => Promise<boolean>;
  onDetail: () => void;
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
  demographics,
  onLoadDemographics,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  // 開いたとき、または投票で集計が破棄されたときに取り直す
  useEffect(() => {
    if (expanded && !demographics) onLoadDemographics(frame.id);
  }, [expanded, demographics, frame.id, onLoadDemographics]);
  const detailsId = useId();
  const titleId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { vote } = frame;
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
          <button
            className="summary-detail"
            onClick={onDetail}
          >
            詳細
          </button>
        </div>
      </div>
      <div className="summary-content">
        <div
          className="pie"
          role="img"
          aria-label={`賛成${agreePercent}%、反対${disagreePercent}%`}
          style={stanceTotal ? {
            background: `linear-gradient(to right,var(--blue) ${agreePercent}%,var(--pink) ${agreePercent}%)`,
          } : undefined}
        >
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
        <p className="demographic-note">回答者の構成</p>
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
          <span>賛成</span>
          <span>反対</span>
        </div>
        <div className="dialog-vote-options">
          {[4, 3, 2, 1, 0].map((index) => (
            <button
              key={index}
              className="dialog-vote-dot"
              aria-label={opinionLabels[index]}
              aria-pressed={vote.myValue === index + 1}
              disabled={voteDisabled}
              style={{ background: opinionColors[index] }}
              onClick={() => void onVote(frame.id, (index + 1) as VoteValue)}
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
