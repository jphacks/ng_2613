import TopicSummaryCard from "../components/topic-summary-card";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./summary-screen.css";

type Props = Pick<DiscussionState, "navigate" | "vote" | "setVote">;
export default function SummaryScreen(props: Props) {
    return <section className="summaries">{["cream", "white", "blue"].map(color =>
        <TopicSummaryCard key={color} {...props} color={color} />
    )}</section>;
}
