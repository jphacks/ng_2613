import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import TopicSummaryCard from "../components/topic-summary-card";
import "./discussion-screen.css";

type Props = Pick<DiscussionState, "navigate" | "topicStatus" | "topicError" | "retryTopic" | "selectedFrame" | "selectedFrameNumber" | "threads" | "threadsStatus" | "threadsError" | "retryThreads" | "selectThread" | "voteSubmittingFrameId" | "voteErrors" | "submitVote">;
export default function DiscussionScreen(props: Props) {
    if (props.topicStatus !== "success" || !props.selectedFrame) {
        return <DataState status={props.topicStatus === "success" ? "error" : props.topicStatus} error={props.topicStatus === "success" ? "指定された設問が見つかりません。" : props.topicError} emptyMessage="このトピックには設問がありません。" onRetry={props.retryTopic} onLogin={() => props.navigate("login")}/>;
    }
    const frame = props.selectedFrame;
    const threads = props.threadsStatus === "success" ? props.threads : [];
    return <section className="discussion-list">
        <TopicSummaryCard frame={frame} questionNumber={props.selectedFrameNumber} threads={threads} submitting={props.voteSubmittingFrameId === frame.id} error={props.voteErrors[frame.id] ?? ""} onVote={props.submitVote} onThread={threadId => props.selectThread(threadId)} />
        <div className="discussion-opinions" aria-labelledby="discussion-opinions-heading">
            <h2 id="discussion-opinions-heading">みんなの意見</h2>
            {props.threadsStatus === "error" && <DataState status="error" error={props.threadsError} emptyMessage="" onRetry={props.retryThreads}/>}
            {threads.map(thread =>
            <button key={thread.id} className={`opinion-row ${thread.stance === "agree" ? "blue" : "pink"}`} onClick={() => props.selectThread(thread.id)}><span className="opinion-text">{thread.title}</span><span>＞</span></button>
        )}</div>
        <button type="button" className="add-opinion" aria-label="意見を追加" onClick={() => props.navigate("new-thread")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        </button>
    </section>;
}
