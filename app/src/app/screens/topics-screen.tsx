import { DictionaryText } from "../components/dictionary";
import Image from "next/image";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./topics-screen.css";
type Props = Pick<DiscussionState, "selectedTopic" | "navigate">;
export default function TopicsScreen({ selectedTopic, navigate }: Props) {
    return (<section className="middle-topics">
    <Image className="topic-hero" src={selectedTopic.image} alt={selectedTopic.label} width={150} height={150} priority/>{["pink", "blue", "cream", "white"].map(color => <div className={`topic-row ${color}`} key={color}>
        <button type="button" className="topic-row-navigation" aria-label="消費税のトピックを開く" onClick={() => navigate("summary")} />
        <span className="topic-row-term"><DictionaryText>消費税</DictionaryText></span>
    </div>)}</section>);
}
