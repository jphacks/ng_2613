import { DictionaryText } from "../components/dictionary";
import Image from "next/image";
import DataState from "../components/data-state";
import { getMiddleTopicImage } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./topics-screen.css";
type Props = Pick<DiscussionState, "selectedMiddleTopic" | "catalogStatus" | "catalogError" | "navigate" | "selectTopic">;
const colors = ["pink", "blue", "cream", "white"];
export default function TopicsScreen({ selectedMiddleTopic, catalogStatus, catalogError, navigate, selectTopic }: Props) {
    if (catalogStatus !== "success" || !selectedMiddleTopic) {
        return <DataState status={catalogStatus === "success" ? "error" : catalogStatus} error={catalogStatus === "success" ? "指定された分類が見つかりません。" : catalogError} emptyMessage="表示できる分類がありません。" onRetry={() => navigate("home")} onLogin={() => navigate("login")}/>;
    }
    const image = getMiddleTopicImage(selectedMiddleTopic.name);
    return (<section className="middle-topics">
    {image ? <Image className="topic-hero" src={image} alt={selectedMiddleTopic.name} width={150} height={150} priority/> : <div className="topic-hero topic-image-placeholder" aria-hidden="true"/>}{selectedMiddleTopic.topics.map((topic, index) => <div className={`topic-row ${colors[index % colors.length]}`} key={topic.id}>
        <button type="button" className="topic-row-navigation" aria-label={`${topic.name}のトピックを開く`} onClick={() => selectTopic(topic.id)} />
        <span className="topic-row-term"><DictionaryText>{topic.name}</DictionaryText></span>
    </div>)}</section>);
}
