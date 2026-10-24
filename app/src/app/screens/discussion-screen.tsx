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
    </section>;
}
