import DataState from "../components/data-state";
import VoteForm from "../components/vote-form";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./vote-screen.css";

type Props = Pick<DiscussionState,
  | "selectedFrame"
  | "topicStatus"
  | "topicError"
  | "voteSubmittingFrameId"
  | "voteErrors"
  | "submitVote"
  | "navigate"
>;

export default function VoteScreen(props: Props) {
  if (props.topicStatus !== "success" || !props.selectedFrame) {
    return <DataState
      status={props.topicStatus === "success" ? "error" : props.topicStatus}
      error={props.topicStatus === "success" ? "投票する設問を選んでください。" : props.topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={() => props.navigate("home")}
      onLogin={() => props.navigate("login")}
    />;
  }

  const frame = props.selectedFrame;
  return <section className="vote-screen">
    <div className="video-placeholder" role="img" aria-label="動画表示エリア" />
    <VoteForm
      key={frame.id}
      frame={frame}
      submitting={props.voteSubmittingFrameId === frame.id}
      error={props.voteErrors[frame.id] ?? ""}
      onVote={props.submitVote}
      actions={[
        { label: "トピックへ", variant: "primary", onComplete: () => props.navigate("summary") },
        { label: "ホームへ", variant: "secondary", onComplete: () => props.navigate("home") },
      ]}
    />
  </section>;
}
