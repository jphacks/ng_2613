import { useState } from "react";
import { DictionaryText } from "./dictionary";
import type { TopicFrame } from "../lib/catalog/types";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { VoteValue } from "../lib/votes/types";

const changeIntervalMilliseconds = 7 * 24 * 60 * 60 * 1000;

export type VoteFormAction = {
  label: string;
  variant: "primary" | "secondary";
  onComplete: () => void;
  requiresVote?: boolean;
};

type Props = {
  frame: TopicFrame;
  submitting: boolean;
  error: string;
  onVote: (frameId: string, value: VoteValue) => Promise<boolean>;
  actions: VoteFormAction[];
  compact?: boolean;
};

export default function VoteForm({ frame, submitting, error, onVote, actions, compact = false }: Props) {
  const [vote, setVote] = useState<VoteValue | null>(frame.vote.myValue);
  const [openedAt] = useState(() => Date.now());
  const locked = !frame.vote.votingOpen || (frame.vote.myValue !== null && !frame.vote.canChange);
  const changeAt = frame.vote.canChangeAt
    ?? new Date(openedAt + changeIntervalMilliseconds).toISOString();
  const changeDate = new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(changeAt));

  async function complete(action: VoteFormAction) {
    if (vote !== null && vote !== frame.vote.myValue && !(await onVote(frame.id, vote))) return;
    action.onComplete();
  }

  return <div className={`vote-form${compact ? " vote-form-compact" : ""}`}>
    <h1>Q. <DictionaryText>{frame.question}</DictionaryText></h1>
    <p className="vote-date">
      {frame.vote.votingOpen ? `${changeDate} 変更可能` : "投票受付終了"}
    </p>
    <div className="vote-labels">
      <span>反対</span>
      <span>賛成</span>
    </div>
    <div className="vote-options">
      {opinionLabels.map((label, index) => <button
        key={label}
        type="button"
        aria-label={label}
        aria-pressed={vote === index + 1}
        className={`vote-dot ${vote === index + 1 ? "chosen" : ""}`}
        style={{ backgroundColor: opinionColors[index] }}
        disabled={locked || submitting}
        onClick={() => setVote((index + 1) as VoteValue)}
      />)}
    </div>
    <p className="vote-status" role={error ? "alert" : "status"}>
      {error || (vote !== null ? opinionLabels[vote - 1] : "")}
    </p>
    <div className={`vote-actions${vote !== null ? " has-vote" : ""}`}>
      {actions.map((action) => <span className="vote-action" key={action.label}>
        <button
          type="button"
          className={action.variant}
          disabled={(action.requiresVote === true && vote === null) || (vote === null && !locked) || submitting}
          onClick={() => void complete(action)}
        >
          {submitting ? "保存中…" : action.label}
        </button>
        {vote === null && !locked && <span className="vote-action-tooltip" role="tooltip">
          投票してください
        </span>}
      </span>)}
    </div>
  </div>;
}

