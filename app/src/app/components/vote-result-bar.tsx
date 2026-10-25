import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { TopicFrame } from "../lib/catalog/types";
import "../screens/summary-screen.css";

type Props = {
  vote: TopicFrame["vote"];
  drawing?: boolean;
};

// 投票結果の帯グラフ。5段階それぞれの割合で、左から反対→賛成の順に塗り分ける（投票の丸と同じ並び）
export default function VoteResultBar({ vote, drawing = false }: Props) {
  const hasVoted = vote.myValue !== null;
  const voteTotal = vote.counts.reduce((sum, count) => sum + count, 0);
  const barSegments = vote.counts.map((count, index) => ({
    index,
    width: voteTotal ? (count / voteTotal) * 100 : 0,
    percent: voteTotal ? Math.round((count / voteTotal) * 100) : 0,
  }));
  const empty = !hasVoted || !voteTotal;
  return (
    <div
      className={`vote-bar${drawing ? " is-drawing" : ""}${empty ? " is-empty" : ""}`}
      role="img"
      aria-label={hasVoted
        ? barSegments.map((segment) => `${opinionLabels[segment.index]}${segment.percent}%`).join("、")
        : "投票すると比率が見られます"}
    >
      {empty ? (
        <span className="vote-bar-empty">投票すると比率が見られます</span>
      ) : barSegments.filter((segment) => segment.width > 0).map((segment) => (
        <span
          key={segment.index}
          className="vote-bar-segment"
          style={{ width: `${segment.width}%`, background: opinionColors[segment.index] }}
        >
          {/* 5%未満の細い区間は数字が収まらないので出さない */}
          {segment.percent >= 5 && <span aria-hidden="true">{segment.percent}%</span>}
        </span>
      ))}
    </div>
  );
}
