import type { DiscussionState } from "../hooks/use-discussion-state";
import "./video-screen.css";
type Props = Pick<DiscussionState, "navigate">;
export default function VideoScreen({ navigate }: Props) {
    return (<section className="video-screen">
    <button className="close-video" aria-label="動画を閉じて投票へ" onClick={() => navigate("vote")}>×</button>
    <div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）"/>
    </section>);
}
