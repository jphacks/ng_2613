import Image from "next/image";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import { getMiddleTopicImage } from "../lib/demo-data";
import "./topics-screen.css";

type Props = Pick<
  DiscussionState,
  "selectedMiddleTopic" | "catalogStatus" | "catalogError" | "retryCatalog" | "navigate" | "selectTopic"
>;
const colors = ["pink", "blue", "cream", "white"];

export default function TopicsScreen({
  selectedMiddleTopic,
  catalogStatus,
  catalogError,
  retryCatalog,
  navigate,
  selectTopic,
}: Props) {
  if (catalogStatus !== "success") {
    return <DataState
      status={catalogStatus}
      error={catalogError}
      emptyMessage="表示できる分類がありません。"
      onRetry={retryCatalog}
      onLogin={() => navigate("login")}
    />;
  }
  if (!selectedMiddleTopic) {
    return <div className="data-state" role="alert">
      <p>指定された中分類が見つかりません。</p>
      <button className="secondary" onClick={() => navigate("home")}>分類一覧へ</button>
    </div>;
  }

  const image = getMiddleTopicImage(selectedMiddleTopic.name);
  return <section className="middle-topics">
    {image
      ? <Image className="topic-hero" src={image} alt={selectedMiddleTopic.name} width={150} height={150} priority />
      : <div className="topic-hero topic-image-placeholder" aria-hidden="true">●</div>}
    {selectedMiddleTopic.topics.length === 0
      ? <p className="data-state">この中分類には表示できるトピックがありません。</p>
      : selectedMiddleTopic.topics.map((topic, index) =>
          <button
            className={`topic-row ${colors[index % colors.length]}`}
            key={topic.id}
            onClick={() => selectTopic(topic.id)}
          >
            {topic.name}{topic.status === "locked" ? "（閲覧のみ）" : ""}
          </button>)}
  </section>;
}
