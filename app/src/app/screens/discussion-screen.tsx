import { useState } from "react";
import type { DiscussionState } from "../hooks/use-discussion-state";
import TopicSummaryCard from "../components/topic-summary-card";
import "./discussion-screen.css";

type Props = Pick<DiscussionState, "navigate" | "vote" | "setVote">;
export default function DiscussionScreen(props: Props) {
    const [reactionFlashes, setReactionFlashes] = useState<Record<number, number>>({});
    return <section className="discussion-list">
        <TopicSummaryCard {...props} />
        <div className="discussion-opinions" aria-labelledby="discussion-opinions-heading">
            <h2 id="discussion-opinions-heading">みんなの意見</h2>
            {["生活苦しいから増税しないで", "お金余ってるから増税して", "生活苦しいから増税しないで"].map((text, index) =>
            <div key={index} className={`opinion-row ${index === 1 ? "blue" : "pink"}`}>
                <button type="button" className={`opinion-reaction${reactionFlashes[index] ? " is-reacted" : ""}`} aria-label={`「${text}」になるほど`}
                    aria-pressed={Boolean(reactionFlashes[index])}
                    onClick={() => setReactionFlashes(current => ({ ...current, [index]: current[index] ? 0 : 1 }))}>
                    <svg key={reactionFlashes[index] ?? 0} className={reactionFlashes[index] ? "reaction-bulb is-flashing" : "reaction-bulb"} width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 10v8M9.5 8.5 12 11l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>なるほど</span>
                </button>
                <button type="button" className="opinion-message" onClick={() => props.navigate("thread")}>
                    <span>{text}</span><span aria-hidden="true">＞</span>
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
