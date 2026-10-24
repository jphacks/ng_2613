import Image from "next/image";
import { topics } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./home-screen.css";
type Props = Pick<DiscussionState, "setCategory" | "navigate">;
export default function HomeScreen({ setCategory, navigate }: Props) {
    return (<div className="topic-grid">
      {topics.map((topic, index) => (<button className="topic-tile" key={topic.label} onClick={() => {
                setCategory(index);
                navigate("topics");
            }}>
          <Image src={topic.image} alt="" width={150} height={150} priority/>
          <span>{topic.label}</span>
        </button>))}
    </div>);
}
