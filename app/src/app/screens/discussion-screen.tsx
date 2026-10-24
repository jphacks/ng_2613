import type { DiscussionState } from "../hooks/use-discussion-state";
import TopicSummaryCard from "../components/topic-summary-card";
import "./discussion-screen.css";

type Props = Pick<DiscussionState, "navigate" | "vote" | "setVote">;
export default function DiscussionScreen(props: Props) {
    return <section className="discussion-list">
        <TopicSummaryCard {...props} />
        <div className="discussion-opinions" aria-label="議論の一覧">{["生活苦しいから増税しないで", "お金余ってるから増税して", "生活苦しいから増税しないで"].map((text, index) =>
            <button key={index} className={`opinion-row ${index === 1 ? "blue" : "pink"}`} onClick={() => props.navigate("thread")}>{text}<span>＞</span></button>
        )}</div>
        <button type="button" className="add-opinion" aria-label="意見を追加" onClick={() => props.navigate("new-thread")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        </button>
    </section>;
}
