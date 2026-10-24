import type { DiscussionState } from "../hooks/use-discussion-state";
import "./discussion-screen.css";
type Props = Pick<DiscussionState, "navigate">;
export default function DiscussionScreen({ navigate }: Props) {
    return (<section className="discussion-list">
    <h1>Q1. 増税するべきか</h1>{["生活苦しいから増税しないで", "お金余ってるから増税して", "生活苦しいから増税しないで"].map((text, index) => <button key={index} className={`opinion-row ${index === 1 ? "blue" : "pink"}`} onClick={() => navigate("thread")}>{text}<span>＞</span>
        </button>)}</section>);
}
