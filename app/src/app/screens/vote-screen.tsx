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
    <div className="vote-options">{opinionLabels.map((label, index) => <button key={label} aria-label={label} aria-pressed={vote === index} className={`vote-dot ${vote === index ? "chosen" : ""}`} style={{ backgroundColor: opinionColors[index] }} onClick={() => setVote(index)}/>)}</div><p className="vote-status" role="status">{vote !== null ? opinionLabels[vote] : ""}</p><div className={`vote-actions${vote !== null ? " has-vote" : ""}`}>
    <span className="vote-action">
    <button className="primary" disabled={vote === null} aria-describedby={vote === null ? "topic-vote-tooltip" : undefined} onClick={() => navigate("summary")}>トピックへ</button>
    {vote === null && <span className="vote-action-tooltip" id="topic-vote-tooltip" role="tooltip">投票してください</span>}
    </span>
    <span className="vote-action">
    <button className="secondary" disabled={vote === null} aria-describedby={vote === null ? "home-vote-tooltip" : undefined} onClick={() => navigate("home")}>ホームへ</button>
    {vote === null && <span className="vote-action-tooltip" id="home-vote-tooltip" role="tooltip">投票してください</span>}
    </span>
    </div>
    </section>);
}
