import Image from "next/image";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./topics-screen.css";
type Props = Pick<DiscussionState, "selectedTopic" | "navigate">;
export default function TopicsScreen({ selectedTopic, navigate }: Props) {
    return (<section className="middle-topics">
    <Image className="topic-hero" src={selectedTopic.image} alt={selectedTopic.label} width={150} height={150} priority/>{["pink", "blue", "cream", "white"].map(color => <button className={`topic-row ${color}`} key={color} onClick={() => navigate("summary")}>消費税</button>)}</section>);
}
