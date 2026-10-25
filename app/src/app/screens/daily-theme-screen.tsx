import { useRef, useState } from "react";
import DataState from "../components/data-state";
import VoteForm from "../components/vote-form";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./daily-theme-screen.css";

type Props = Pick<DiscussionState,
  | "dailyTheme"
  | "dailyThemeStatus"
  | "dailyThemeError"
  | "retryDailyTheme"
  | "voteSubmittingFrameId"
  | "voteErrors"
  | "submitVote"
  | "openDailyThemeDiscussion"
  | "navigate"
>;

export default function DailyThemeScreen(props: Props) {
  const [voteVisible, setVoteVisible] = useState(false);
  const [voteCompleted, setVoteCompleted] = useState(false);
  const voteRef = useRef<HTMLDivElement>(null);

  if (props.dailyThemeStatus !== "success" || !props.dailyTheme) {
    return <DataState
      status={props.dailyThemeStatus}
      error={props.dailyThemeError}
      emptyMessage="今日のテーマはまだ公開されていません。"
      onRetry={props.retryDailyTheme}
      onLogin={() => props.navigate("login")}
      skeleton="cards"
    />;
  }

  const theme = props.dailyTheme;
  const frame = { ...theme.frame, sortOrder: null };

  function revealVote() {
    setVoteVisible(true);
    requestAnimationFrame(() => voteRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return <section className="daily-theme-screen">
    <header className="daily-theme-heading">
      <p>今日のテーマ</p>
      <h1>{theme.title}</h1>
      {theme.description && <p className="daily-theme-description">{theme.description}</p>}
    </header>

    <div className="daily-theme-video-wrap">
      <video
        className="daily-theme-video"
        controls
        playsInline
        preload="metadata"
        src={theme.playbackUrl}
        onEnded={revealVote}
      >
        お使いのブラウザは動画の再生に対応していません。
      </video>
    </div>

    {!voteVisible && <div className="daily-theme-skip">
      <p>動画を見終えると投票が表示されます。</p>
      <button type="button" className="secondary" onClick={revealVote}>
        スキップして投票へ
      </button>
    </div>}

    {voteVisible && <div className="daily-theme-vote" ref={voteRef}>
      <VoteForm
        key={frame.id}
        compact
        frame={frame}
        submitting={props.voteSubmittingFrameId === frame.id}
        error={props.voteErrors[frame.id] ?? ""}
        onVote={props.submitVote}
        actions={[{
          label: !frame.vote.votingOpen
            ? "投票受付終了"
            : frame.vote.myValue === null ? "投票する" : "投票済み",
          variant: "primary",
          requiresVote: true,
          onComplete: () => setVoteCompleted(true),
        }]}
      />
      {(voteCompleted || frame.vote.myValue !== null || !frame.vote.votingOpen) && <div className="daily-theme-after-vote" role="status">
        <p>{frame.vote.votingOpen ? "投票を受け付けました。" : "この投票は受付を終了しています。"}</p>
        <button type="button" className="secondary" onClick={props.openDailyThemeDiscussion}>
          この問いの議論へ
        </button>
      </div>}
    </div>}
  </section>;
}

