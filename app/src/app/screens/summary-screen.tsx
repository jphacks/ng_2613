import DataState from "../components/data-state";
import TopicSummaryCard from "../components/topic-summary-card";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./summary-screen.css";

type Props = Pick<DiscussionState, "topicDetail" | "topicStatus" | "topicError" | "retryTopic" | "navigate" | "frameThreads" | "selectFrame" | "selectThread" | "voteSubmittingFrameId" | "voteErrors" | "submitVote">;
// カードの背景は元のクリーム色にそろえる
const colors = ["cream"];
export default function SummaryScreen(props: Props) {
    if (props.topicStatus !== "success" || !props.topicDetail) {
        return <DataState status={props.topicStatus} error={props.topicError} emptyMessage="このトピックには設問がありません。" onRetry={props.retryTopic} onLogin={() => props.navigate("login")} skeleton="cards"/>;
    }
    const frames = props.topicDetail.periods.flatMap(period => period.frames);
    return <section className="summaries">{frames.map((frame, index) =>
        <TopicSummaryCard key={frame.id} color={colors[index % colors.length]} questionNumber={index + 1} frame={frame} threads={props.frameThreads[frame.id] ?? []} submitting={props.voteSubmittingFrameId === frame.id} error={props.voteErrors[frame.id] ?? ""} onVote={props.submitVote} onDetail={() => props.selectFrame(frame.id)} onThread={threadId => props.selectThread(threadId, frame.id)} />
    )}</section>;
}
