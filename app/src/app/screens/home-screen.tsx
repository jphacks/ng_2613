import { useState } from "react";
import Image from "next/image";
import DataState from "../components/data-state";
import ExploreMap, { TelescopeIcon } from "../components/explore-map";
import { getMiddleTopicImage } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./home-screen.css";
type Props = Pick<DiscussionState, "homeTab" | "selectedGenre" | "catalogStatus" | "catalogError" | "retryCatalog" | "navigate" | "selectMiddleTopic" | "genres" | "selectTopic">;
export default function HomeScreen(props: Props) {
    const [exploring, setExploring] = useState(false);
    return (<>
      <HomeContent {...props}/>
      {/* AI チャットから分かれた先のおすすめの問いを、望遠鏡で探す（今はモック） */}
      {props.catalogStatus === "success" && <button type="button" className="explore-open" onClick={() => setExploring(true)}>
        <TelescopeIcon />探索する
      </button>}
      {exploring && <ExploreMap genres={props.genres} onTopic={props.selectTopic} onClose={() => setExploring(false)}/>}
    </>);
}
function HomeContent({ homeTab, selectedGenre, catalogStatus, catalogError, retryCatalog, navigate, selectMiddleTopic }: Props) {
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
