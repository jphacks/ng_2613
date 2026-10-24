import { useState } from "react";
import DataState from "../components/data-state";
import { opinionLabels, opinionColors } from "../lib/demo-data";
import type { DiscussionState } from "../hooks/use-discussion-state";
import type { VoteValue } from "../lib/votes/types";
import "./vote-screen.css";
type Props = Pick<DiscussionState, "selectedFrame" | "topicStatus" | "topicError" | "retryTopic" | "voteSubmittingFrameId" | "voteErrors" | "submitVote" | "navigate">;
type Frame = NonNullable<DiscussionState["selectedFrame"]>;
const changeIntervalMilliseconds = 7 * 24 * 60 * 60 * 1000;
export default function VoteScreen(props: Props) {
    if (props.topicStatus !== "success" || !props.selectedFrame) {
        return <DataState status={props.topicStatus === "success" ? "error" : props.topicStatus} error={props.topicStatus === "success" ? "投票する設問を選んでください。" : props.topicError} emptyMessage="このトピックには設問がありません。" onRetry={() => props.navigate("home")} onLogin={() => props.navigate("login")}/>;
    }
    return <VoteForm key={props.selectedFrame.id} {...props} frame={props.selectedFrame}/>;
}
function VoteForm({ frame, voteSubmittingFrameId, voteErrors, submitVote, navigate }: Props & { frame: Frame }) {
    const [vote, setVote] = useState<VoteValue | null>(frame.vote.myValue);
    const [openedAt] = useState(() => Date.now());
    const submitting = voteSubmittingFrameId === frame.id;
    const locked = !frame.vote.votingOpen || (frame.vote.myValue !== null && !frame.vote.canChange);
    // 投票後は7日間変更できないため、これから投票する場合も変更可能になる日を示す。
    const changeAt = frame.vote.canChangeAt ?? new Date(openedAt + changeIntervalMilliseconds).toISOString();
    const changeDate = new Intl.DateTimeFormat("ja-JP", { month: "numeric", day: "numeric", timeZone: "Asia/Tokyo" }).format(new Date(changeAt));
    async function leave(next: "summary" | "home") {
        if (vote !== null && vote !== frame.vote.myValue && !(await submitVote(frame.id, vote))) return;
        navigate(next);
    }
    return (<section className="vote-screen">
    <div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）"/>
    <h1>Q. {frame.question}</h1>
    <p className="vote-date">{frame.vote.votingOpen ? `${changeDate} 変更可能` : "投票受付終了"}</p>
    <div className="vote-labels">
    <span>反対</span>
    <span>賛成</span>
    </div>
    <div className="vote-options">{opinionLabels.map((label, index) => <button key={label} aria-label={label} aria-pressed={vote === index + 1} className={`vote-dot ${vote === index + 1 ? "chosen" : ""}`} style={{ backgroundColor: opinionColors[index] }} disabled={locked || submitting} onClick={() => setVote((index + 1) as VoteValue)}/>)}</div><p className="vote-status" role="status">{voteErrors[frame.id] || (vote !== null ? opinionLabels[vote - 1] : "")}</p><div className={`vote-actions${vote !== null ? " has-vote" : ""}`}>
    <span className="vote-action">
    <button className="primary" disabled={(vote === null && !locked) || submitting} aria-describedby={vote === null ? "topic-vote-tooltip" : undefined} onClick={() => void leave("summary")}>トピックへ</button>
    {vote === null && !locked && <span className="vote-action-tooltip" id="topic-vote-tooltip" role="tooltip">投票してください</span>}
    </span>
    <span className="vote-action">
    <button className="secondary" disabled={(vote === null && !locked) || submitting} aria-describedby={vote === null ? "home-vote-tooltip" : undefined} onClick={() => void leave("home")}>ホームへ</button>
    {vote === null && !locked && <span className="vote-action-tooltip" id="home-vote-tooltip" role="tooltip">投票してください</span>}
    </span>
    </div>
    </section>);
}
