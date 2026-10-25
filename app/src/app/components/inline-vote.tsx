import { useId, useRef, useState } from "react";
import { opinionColors, opinionLabels } from "../lib/demo-data";
import type { TopicFrame } from "../lib/catalog/types";
import type { VoteValue } from "../lib/votes/types";
import "../screens/summary-screen.css";

type Props = {
  frame: TopicFrame;
  questionNumber: number;
  submitting: boolean;
  error: string;
  onVote: (frameId: string, value: VoteValue) => Promise<boolean>;
  // 投票できたとき。帯グラフを描き直すのに使う
  onVoted?: () => void;
};

function formatChangeDate(value: string) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    timeZone: "Asia/Tokyo",
  }).format(new Date(value));
}

// 反対 ●●●●● 賛成 の投票の帯と、押したときの確認のモーダル。
// 設問カードと議論の画面の両方で使う
export default function InlineVote({ frame, questionNumber, submitting, error, onVote, onVoted }: Props) {
  // 丸を押したらすぐ投票せず、確認のモーダルを出す。投票後7日間は変更できないため
  const [pendingValue, setPendingValue] = useState<VoteValue | null>(null);
  const confirmRef = useRef<HTMLDialogElement>(null);
  const confirmTitleId = useId();
  const { vote } = frame;
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
    <>
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
                    onVoted?.();
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
    </>
  );
}
