import Image from "next/image";
import DataState from "../components/data-state";
import { getMiddleTopicImage } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./home-screen.css";
type Props = Pick<DiscussionState, "selectedGenre" | "catalogStatus" | "catalogError" | "retryCatalog" | "navigate" | "selectMiddleTopic">;
export default function HomeScreen({ selectedGenre, catalogStatus, catalogError, retryCatalog, navigate, selectMiddleTopic }: Props) {
    if (catalogStatus !== "success" || !selectedGenre) {
        return <DataState status={catalogStatus} error={catalogError} emptyMessage="表示できる分類がありません。" onRetry={retryCatalog} onLogin={() => navigate("login")}/>;
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
