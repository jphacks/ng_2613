import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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
    onSend: (text: string, stance: PostStance | null) => Promise<boolean>;
    // 中立を選べるか。意見（スレッド）は賛成か反対が必須なので、新しく立てるときは出さない
    allowNeutral?: boolean;
};
type Props = Pick<DiscussionState, "profile" | "selectedFrame" | "selectedFrameNumber" | "navigate" | "threadDetail" | "threadDetailStatus" | "threadDetailError" | "retryThreadDetail" | "commentSubmitting" | "commentSubmitError" | "submitComment">;
// 同じ人は常に同じ色になるよう、ユーザー ID から色を決める。
function avatarColor(id: string) {
    const total = Array.from(id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
    return avatarColors[total % avatarColors.length];
}
// 入力欄の高さの上限。3行（行の高さ20px）＋上下の余白
const composerMaxHeight = 20 * 3 + 12;
function stanceClass(label: string) {
    return label === "賛成" ? "agree" : label === "反対" ? "disagree" : "neutral";
}
export function ThreadView({ profile, selectedFrame, selectedFrameNumber, messages, submitting, error, onSend, allowNeutral = true }: ThreadViewProps) {
    const [message, setMessage] = useState("");
    // 入力欄は端まで打つと自動で折り返し、3行までは枠ごと伸びる（それ以上は中でスクロール）
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useLayoutEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, composerMaxHeight)}px`;
    }, [message]);
    const [stance, setStance] = useState("賛成");
    const stanceLabels = allowNeutral ? ["賛成", "中立", "反対"] : ["賛成", "反対"];
    return (<section className="thread">
    {selectedFrame && <h1>Q{selectedFrameNumber}. <DictionaryText>{selectedFrame.question}</DictionaryText></h1>}
    <div className="message-list">
    {messages.map(item => {
        const own = item.author.id === profile.id;
        return <div key={item.id} className={`message-row${own ? " own" : ""}`}>
            {/* 自分の発言はアイコンと名前を出さず、吹き出しだけにする */}
            {!own && <span className="sender-avatar" style={{ backgroundColor: avatarColor(item.author.id) }} role="img" aria-label={`${item.author.username}のアイコン`}>{usernameInitial(item.author.username)}</span>}
            <div className="message-content">
                {!own && <span className="sender-name">{item.author.username}</span>}
                <p className={`bubble ${item.stance ?? ""}`}><DictionaryText>{item.body}</DictionaryText></p>
            </div>
        </div>;
    })}</div>
    <form className="composer" onSubmit={async event => { event.preventDefault(); if (message.trim() && !submitting) {
        // 中立は立場なし（null）として送る
        if (await onSend(message.trim(), stance === "賛成" ? "agree" : stance === "反対" ? "disagree" : null)) setMessage("");
    } }}>
    {/* 上の行で立場を選び、下の行でコメントを打つ */}
    {/* 選んだ立場の色の丸い背景を1つだけ描き、切り替えたときに横にすべらせる */}
    <div className="stance-switch" style={{ "--stance-count": stanceLabels.length, "--stance-index": Math.max(0, stanceLabels.indexOf(stance)) } as CSSProperties}>
        <span className={`stance-thumb ${stanceClass(stance)}`} aria-hidden="true" />
        {stanceLabels.map(label => <button type="button" key={label} className={stance === label ? "selected" : ""} aria-pressed={stance === label} onClick={() => setStance(label)}>{label}</button>)}
    </div>
    <div className="composer-row">
    <textarea ref={textareaRef} rows={1} aria-label="意見を入力" value={message} onChange={event => setMessage(event.target.value)} required
        onKeyDown={event => {
            // LINE と同じく、スマホでは Enter は改行で送信はボタンだけ。
            // パソコンでは Enter で送信、Shift+Enter で改行。日本語の変換を確定する Enter では送らない
            const touchDevice = window.matchMedia("(pointer: coarse)").matches;
            if (!touchDevice && event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
            }
        }}/>
    <button className="send" aria-label="意見を送信" type="submit" disabled={submitting}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
    </button>
    </div>
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
