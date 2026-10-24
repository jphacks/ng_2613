"use client";

import { useState } from "react";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { VoteValue } from "../lib/votes/types";
import "./vote-screen.css";

type Props = Pick<DiscussionState,
  | "selectedFrame" | "topicStatus" | "topicError" | "retryTopic" | "navigate"
  | "voteSubmittingFrameId" | "voteErrors" | "submitVote"
>;

export default function VoteScreen(props: Props) {
  if (props.topicStatus !== "success") {
    return <DataState
      status={props.topicStatus}
      error={props.topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={props.retryTopic}
      onLogin={() => props.navigate("login")}
    />;
  }
  if (!props.selectedFrame) {
    return <div className="data-state" role="alert">指定された設問が見つかりません。</div>;
  }

  return <VoteForm
    key={`${props.selectedFrame.id}:${props.selectedFrame.vote.myValue ?? ""}`}
    {...props}
    frame={props.selectedFrame}
  />;
}

type VoteFormProps = Props & {
  frame: NonNullable<DiscussionState["selectedFrame"]>;
};

function VoteForm(props: VoteFormProps) {
  const [selected, setSelected] = useState<VoteValue | null>(props.frame.vote.myValue);

  const frame = props.frame;
  const submitting = props.voteSubmittingFrameId === frame.id;
  const error = props.voteErrors[frame.id] ?? "";
  const locked = frame.vote.myValue !== null && !frame.vote.canChange;

  async function saveVote() {
    if (selected === null) return;
    if (await props.submitVote(frame.id, selected)) props.navigate("summary");
  }

  return <section className="vote-screen">
    <div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）" />
    <h1>{frame.question}</h1>
    <p className="vote-date">
      {!frame.vote.votingOpen ? "投票受付は終了しました" : locked ? "現在は変更できません" : "投票を選択してください"}
    </p>
    <div className="vote-labels"><span>反対</span><span>賛成</span></div>
    <div className="vote-options">
      {opinionLabels.map((label, index) => {
        const value = (index + 1) as VoteValue;
        return <button
          key={label}
          aria-label={label}
          aria-pressed={selected === value}
          className={`vote-dot ${selected === value ? "chosen" : ""}`}
          style={{ backgroundColor: opinionColors[index] }}
          disabled={submitting || !frame.vote.votingOpen || locked}
          onClick={() => setSelected(value)}
        />;
      })}
    </div>
    <p className="vote-status" role="status">{selected ? opinionLabels[selected - 1] : ""}</p>
    {error && <p className="vote-status" role="alert">{error}</p>}
    <div className={`vote-actions${selected !== null ? " has-vote" : ""}`}>
      <span className="vote-action">
        <button
          className="primary"
          disabled={selected === null || submitting || !frame.vote.votingOpen || locked}
          onClick={() => void saveVote()}
        >{submitting ? "送信中…" : "投票する"}</button>
      </span>
      <span className="vote-action">
        <button className="secondary" onClick={() => props.navigate("summary")}>戻る</button>
      </span>
    </div>
  </section>;
}
