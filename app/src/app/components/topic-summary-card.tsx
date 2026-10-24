import { useId, useRef, useState } from "react";
import type { DiscussionState } from "../hooks/use-discussion-state";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import "../screens/summary-screen.css";

type Props = Pick<DiscussionState, "navigate" | "vote" | "setVote"> & {
  color?: string;
  questionNumber?: number;
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
export default function TopicSummaryCard({
  navigate,
  vote,
  setVote,
  color = "cream",
  questionNumber = 1,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const titleId = useId();
  const dialogTitleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  return (
    <article className={`summary-card ${color}`} aria-labelledby={titleId}>
      <div className="summary-heading">
        <h1 id={titleId}>Q{questionNumber}. 増税するべきか</h1>
        <div className="summary-buttons">
          <button
            className="summary-vote"
            onClick={() => dialogRef.current?.showModal()}
          >
            投票
          </button>
          <button
            className="summary-detail"
            onClick={() => navigate("discussion")}
          >
            詳細
          </button>
        </div>
      </div>
      <div className="summary-content">
        <div
          className="pie"
          role="img"
          aria-label="賛成50%、反対50%（デモデータ）"
        >
          <span>
            賛成
            <br />
            50%
          </span>
          <span>
            反対
            <br />
            50%
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
                  <button
                    aria-label={`議題${questionNumber}の賛成意見${row + 1}`}
                    onClick={() => navigate("thread")}
                  >
                    いいと思う！！
                  </button>
                </td>
                <td>
                  <button
                    aria-label={`議題${questionNumber}の反対意見${row + 1}`}
                    onClick={() => navigate("thread")}
                  >
                    良くないと思う
                  </button>
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
        <h2 id={dialogTitleId}>Q{questionNumber}. 増税するべきか</h2>
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
              aria-pressed={vote === index}
              style={{ background: opinionColors[index] }}
              onClick={() => setVote(index)}
            />
          ))}
        </div>
        <p className="dialog-vote-status" role="status">
          {vote === null
            ? "あなたの意見を選んでください"
            : `「${opinionLabels[vote]}」を選択しました（デモ）`}
        </p>
      </dialog>
    </article>
  );
}
