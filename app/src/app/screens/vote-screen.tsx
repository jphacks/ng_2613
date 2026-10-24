import { opinionLabels, opinionColors } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./vote-screen.css";
type Props = Pick<DiscussionState, "vote" | "setVote" | "navigate">;
export default function VoteScreen({ vote, setVote, navigate }: Props) {
    return (<section className="vote-screen">
    <div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）"/>
    <h1>Q. ああああああああ？</h1>
    <p className="vote-date">3/2 変更可能</p>
    <div className="vote-labels">
    <span>反対</span>
    <span>賛成</span>
    </div>
    <div className="vote-options">{opinionLabels.map((label, index) => <button key={label} aria-label={label} aria-pressed={vote === index} className={`vote-dot ${vote === index ? "chosen" : ""}`} style={{ backgroundColor: opinionColors[index] }} onClick={() => setVote(index)}/>)}</div>{vote !== null && <p className="vote-status" role="status">「{opinionLabels[vote]}」を選択しました</p>}<div className="vote-actions">
    <button className="primary" onClick={() => navigate("summary")}>トピックへ</button>
    <button className="secondary" onClick={() => navigate("home")}>ホームへ</button>
    </div>
    </section>);
}
