"use client";

import { useState } from "react";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { FrameVoteState, VoteValue } from "../lib/votes/types";
import "../screens/summary-screen.css";

type Props = {
  color?: string;
  frameId: string;
  questionNumber: number;
  question: string;
  vote: FrameVoteState;
  submitting: boolean;
  error: string;
  onVote: (frameId: string, value: VoteValue) => Promise<boolean>;
  onDetail: () => void;
};

export default function TopicSummaryCard({
  color = "cream",
  frameId,
  questionNumber,
  question,
  vote,
  submitting,
  error,
  onVote,
  onDetail,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<VoteValue | null>(vote.myValue);
  const changeLocked = vote.myValue !== null && !vote.canChange;
  const votingDisabled = submitting || !vote.votingOpen || changeLocked;

  function openDialog() {
    setSelected(vote.myValue);
    setDialogOpen(true);
  }

  async function submit() {
    if (selected === null) return;
    if (await onVote(frameId, selected)) setDialogOpen(false);
  }

  const changeDate = vote.canChangeAt
    ? new Intl.DateTimeFormat("ja-JP", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Tokyo",
      }).format(new Date(vote.canChangeAt))
    : null;

  return <article className={`summary-card ${color}`}>
    <div className="summary-heading">
      <h1>Q{questionNumber}. {question}</h1>
      <div className="summary-buttons">
        <button className="summary-vote" disabled={votingDisabled} onClick={openDialog}>
          {!vote.votingOpen ? "受付終了" : changeLocked ? "変更待ち" : vote.myValue ? "投票変更" : "投票"}
        </button>
        <button className="summary-detail" onClick={onDetail}>詳細</button>
      </div>
    </div>
    <div className="vote-results" aria-label={`投票総数 ${vote.totalCount}件`}>
      {opinionLabels.map((label, index) => <div className="vote-result-row" key={label}>
        <span className="vote-result-key" style={{ backgroundColor: opinionColors[index] }} />
        <span>{label}</span>
        <span>{vote.counts[index]}票</span>
      </div>)}
      <p>合計 {vote.totalCount}票</p>
      <p>{vote.myValue ? `あなたの投票：${opinionLabels[vote.myValue - 1]}` : "まだ投票していません。"}</p>
      {changeLocked && changeDate && <p>{changeDate}以降に変更できます。</p>}
      {error && <p className="vote-error" role="alert">{error}</p>}
    </div>
    {dialogOpen && <dialog className="summary-vote-dialog" open>
      <button className="vote-dialog-close" aria-label="閉じる" onClick={() => setDialogOpen(false)}>×</button>
      <h2>Q{questionNumber}. {question}</h2>
      <div className="dialog-vote-labels"><span>反対</span><span>賛成</span></div>
      <div className="dialog-vote-options">
        {opinionLabels.map((label, index) => {
          const value = (index + 1) as VoteValue;
          return <button
            key={label}
            type="button"
            aria-label={label}
            aria-pressed={selected === value}
            className="dialog-vote-dot"
            style={{ backgroundColor: opinionColors[index] }}
            disabled={submitting}
            onClick={() => setSelected(value)}
          />;
        })}
      </div>
      <p className="dialog-vote-status" role="status">
        {selected ? `「${opinionLabels[selected - 1]}」を選択中` : "選択してください"}
      </p>
      {error && <p className="vote-error" role="alert">{error}</p>}
      <button className="primary vote-submit" disabled={submitting || selected === null} onClick={() => void submit()}>
        {submitting ? "送信中…" : "投票する"}
      </button>
    </dialog>}
  </article>;
}
