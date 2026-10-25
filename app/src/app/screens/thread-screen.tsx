import { useState } from "react";
import DataState from "../components/data-state";
import { DictionaryText } from "../components/dictionary";
import type { DiscussionState } from "../hooks/use-discussion-state";
import type { PostAuthor, PostStance } from "../lib/threads/types";
import "./thread-screen.css";
import { avatarColors, usernameInitial } from "../lib/avatar";
type Message = { id: string; body: string; stance: PostStance | null; author: PostAuthor };
type ThreadViewProps = Pick<DiscussionState, "profile" | "selectedFrame" | "selectedFrameNumber"> & {
    messages: Message[];
    submitting: boolean;
    error: string;
    onSend: (text: string, stance: PostStance) => Promise<boolean>;
};
type Props = Pick<DiscussionState, "profile" | "selectedFrame" | "selectedFrameNumber" | "navigate" | "threadDetail" | "threadDetailStatus" | "threadDetailError" | "retryThreadDetail" | "commentSubmitting" | "commentSubmitError" | "submitComment">;
// 同じ人は常に同じ色になるよう、ユーザー ID から色を決める。
function avatarColor(id: string) {
    const total = Array.from(id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
    return avatarColors[total % avatarColors.length];
}
export function ThreadView({ profile, selectedFrame, selectedFrameNumber, messages, submitting, error, onSend }: ThreadViewProps) {
    const [message, setMessage] = useState("");
    const [stance, setStance] = useState("賛成");
    return (<section className="thread">
    {selectedFrame && <h1>Q{selectedFrameNumber}. <DictionaryText>{selectedFrame.question}</DictionaryText></h1>}
    <div className="message-list">
    {messages.map(item => {
        const own = item.author.id === profile.id;
        return <div key={item.id} className={`message-row${own ? " own" : ""}`}>
            <span className="sender-avatar" style={{ backgroundColor: avatarColor(item.author.id) }} role="img" aria-label={`${item.author.username}のアイコン`}>{usernameInitial(item.author.username)}</span>
            <div className="message-content">
                <span className="sender-name">{item.author.username}</span>
                <p className={`bubble ${item.stance ?? ""}`}><DictionaryText>{item.body}</DictionaryText></p>
            </div>
        </div>;
    })}</div>
    <form className="composer" onSubmit={async event => { event.preventDefault(); if (message.trim() && !submitting) {
        if (await onSend(message.trim(), stance === "賛成" ? "agree" : "disagree")) setMessage("");
    } }}>
    <div className="stance-switch">{["賛成", "反対"].map(label => <button type="button" key={label} className={stance === label ? `selected ${label === "賛成" ? "agree" : "disagree"}` : ""} aria-pressed={stance === label} onClick={() => setStance(label)}>{label}</button>)}</div>
    <input aria-label="意見を入力" value={message} onChange={event => setMessage(event.target.value)} required/>
    <button className="send" aria-label="意見を送信" type="submit" disabled={submitting}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
    </button>
    {error && <p className="composer-error" role="alert">{error}</p>}
    </form>
    </section>);
}
export default function ThreadScreen(props: Props) {
    if (props.threadDetailStatus !== "success" || !props.threadDetail) {
        return <DataState status={props.threadDetailStatus} error={props.threadDetailError} emptyMessage="スレッドが見つかりません。" onRetry={props.retryThreadDetail} onLogin={() => props.navigate("login")} skeleton="messages"/>;
    }
    const thread = props.threadDetail;
    return <ThreadView profile={props.profile} selectedFrame={props.selectedFrame} selectedFrameNumber={props.selectedFrameNumber} messages={[{ id: thread.id, body: thread.body, stance: thread.stance, author: thread.author }, ...thread.comments]} submitting={props.commentSubmitting} error={props.commentSubmitError} onSend={(body, stance) => props.submitComment({ body, stance })} />;
}
