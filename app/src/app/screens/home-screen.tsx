import Image from "next/image";
import DataState from "../components/data-state";
import { getMiddleTopicImage } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./home-screen.css";
type Props = Pick<DiscussionState, "homeTab" | "selectedGenre" | "catalogStatus" | "catalogError" | "retryCatalog" | "navigate" | "selectMiddleTopic">;
export default function HomeScreen({ homeTab, selectedGenre, catalogStatus, catalogError, retryCatalog, navigate, selectMiddleTopic }: Props) {
    // 今日のテーマは別のコンテンツで、まだ中身がない
    if (homeTab === "today") {
        return <p className="home-coming-soon">今日のテーマは準備中です</p>;
    }
    if (catalogStatus !== "success" || !selectedGenre) {
        return <DataState status={catalogStatus} error={catalogError} emptyMessage="表示できる分類がありません。" onRetry={retryCatalog} onLogin={() => navigate("login")} skeleton="tiles"/>;
    }
    return (<div className="topic-grid">
      {selectedGenre.middleTopics.map((middleTopic) => {
            const image = getMiddleTopicImage(middleTopic.name);
            return (<button className="topic-tile" key={middleTopic.id} onClick={() => selectMiddleTopic(middleTopic.id)}>
          {image ? <Image src={image} alt="" width={150} height={150} priority/> : <span className="topic-image-placeholder" aria-hidden="true"/>}
          <span>{middleTopic.name}</span>
        </button>);
        })}
    </div>);
}
