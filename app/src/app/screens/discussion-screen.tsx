import { useState } from "react";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import TopicSummaryCard from "../components/topic-summary-card";
import "./discussion-screen.css";

type Props = Pick<DiscussionState, "navigate" | "topicStatus" | "topicError" | "retryTopic" | "selectedFrame" | "selectedFrameNumber" | "threads" | "threadsStatus" | "threadsError" | "retryThreads" | "selectThread" | "voteSubmittingFrameId" | "voteErrors" | "submitVote">;
export default function DiscussionScreen(props: Props) {
    const [reactionFlashes, setReactionFlashes] = useState<Record<string, number>>({});
    if (props.topicStatus !== "success" || !props.selectedFrame) {
        return <DataState status={props.topicStatus === "success" ? "error" : props.topicStatus} error={props.topicStatus === "success" ? "指定された設問が見つかりません。" : props.topicError} emptyMessage="このトピックには設問がありません。" onRetry={props.retryTopic} onLogin={() => props.navigate("login")} skeleton="cards"/>;
    }
    const frame = props.selectedFrame;
    const threads = props.threadsStatus === "success" ? props.threads : [];
    return <section className="discussion-list">
        <TopicSummaryCard frame={frame} questionNumber={props.selectedFrameNumber} threads={threads} submitting={props.voteSubmittingFrameId === frame.id} error={props.voteErrors[frame.id] ?? ""} onVote={props.submitVote} onDetail={() => props.navigate("discussion")} onThread={threadId => props.selectThread(threadId)} />
        <div className="discussion-opinions" aria-labelledby="discussion-opinions-heading">
            <h2 id="discussion-opinions-heading">みんなの意見</h2>
            {props.threadsStatus === "error" && <DataState status="error" error={props.threadsError} emptyMessage="" onRetry={props.retryThreads}/>}
            {threads.map(thread =>
            <div key={thread.id} className={`opinion-row ${thread.stance === "agree" ? "blue" : "pink"}`}>
                <button type="button" className={`opinion-reaction${reactionFlashes[thread.id] ? " is-reacted" : ""}`} aria-label={`「${thread.title}」になるほど`}
                    aria-pressed={Boolean(reactionFlashes[thread.id])}
                    onClick={() => setReactionFlashes(current => ({ ...current, [thread.id]: current[thread.id] ? 0 : 1 }))}>
                    <svg key={reactionFlashes[thread.id] ?? 0} className={reactionFlashes[thread.id] ? "reaction-bulb is-flashing" : "reaction-bulb"} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 10v8M9.5 8.5 12 11l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>なるほど</span>
                </button>
                <button type="button" className="opinion-message" onClick={() => props.selectThread(thread.id)}>
                    <span className="opinion-text">{thread.title}</span><span aria-hidden="true">＞</span>
                </button>
            </div>
        )}</div>
        <button type="button" className="add-opinion" aria-label="意見を追加" onClick={() => props.navigate("new-thread")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        </button>
    </section>;
}
