import { useRef, useState } from "react";
import DataState from "../components/data-state";
import { DictionaryText } from "../components/dictionary";
import VoteResultBar from "../components/vote-result-bar";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./discussion-screen.css";

type Props = Pick<DiscussionState, "navigate" | "topicStatus" | "topicError" | "retryTopic" | "selectedFrame" | "selectedFrameNumber" | "threads" | "threadsStatus" | "threadsError" | "retryThreads" | "selectThread">;
export default function DiscussionScreen(props: Props) {
    const [reactionFlashes, setReactionFlashes] = useState<Record<string, number>>({});
    const [reactionOverrides, setReactionOverrides] = useState<Record<string, boolean>>({});
    const [reactionPending, setReactionPending] = useState<Record<string, boolean>>({});
    const [reactionErrors, setReactionErrors] = useState<Record<string, string>>({});
    const pendingIds = useRef(new Set<string>());

    async function toggleReaction(threadId: string, reacted: boolean) {
        if (pendingIds.current.has(threadId)) return;
        pendingIds.current.add(threadId);
        setReactionPending(current => ({ ...current, [threadId]: true }));
        setReactionErrors(current => ({ ...current, [threadId]: "" }));
        try {
            const response = await fetch(`/api/threads/${encodeURIComponent(threadId)}/reaction`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ reacted: !reacted }),
            });
            const body: unknown = await response.json();
            if (!response.ok) {
                throw new Error(response.status === 401 ? "ログインし直してください。" : "なるほどを保存できませんでした。もう一度お試しください。");
            }
            if (!body || typeof body !== "object" || !("data" in body) || !body.data || typeof body.data !== "object" || !("reacted" in body.data) || typeof body.data.reacted !== "boolean") {
                throw new Error("サーバーから正しい応答を受信できませんでした。");
            }
            const savedReaction = body.data.reacted;
            setReactionOverrides(current => ({ ...current, [threadId]: savedReaction }));
            if (savedReaction) setReactionFlashes(current => ({ ...current, [threadId]: (current[threadId] ?? 0) + 1 }));
        } catch (error) {
            setReactionErrors(current => ({ ...current, [threadId]: error instanceof Error ? error.message : "通信に失敗しました。" }));
        } finally {
            pendingIds.current.delete(threadId);
            setReactionPending(current => ({ ...current, [threadId]: false }));
        }
    }
    if (props.topicStatus !== "success" || !props.selectedFrame) {
        return <DataState status={props.topicStatus === "success" ? "error" : props.topicStatus} error={props.topicStatus === "success" ? "指定された設問が見つかりません。" : props.topicError} emptyMessage="このトピックには設問がありません。" onRetry={props.retryTopic} onLogin={() => props.navigate("login")} skeleton="cards"/>;
    }
    const frame = props.selectedFrame;
    const threads = props.threadsStatus === "success" ? props.threads : [];
    return <section className="discussion-list">
        {/* 設問一覧と同じカードは繰り返さず、何の設問の意見かが分かるよう設問の文だけ出す */}
        <h1 className="discussion-question question-heading">
            <span className="question-number">Q{props.selectedFrameNumber}.</span>
            <span><DictionaryText>{frame.question}</DictionaryText></span>
        </h1>
        {/* 設問一覧のカードと同じ投票結果の帯グラフ */}
        <VoteResultBar vote={frame.vote} />
        <div className="discussion-opinions" aria-label="みんなの意見">
            {props.threadsStatus === "error" && <DataState status="error" error={props.threadsError} emptyMessage="" onRetry={props.retryThreads}/>}
            {threads.map(thread => {
            const reacted = reactionOverrides[thread.id] ?? thread.reacted ?? false;
            return <div key={thread.id}>
            {/* なるほどは枠の外の左に置く。押すと電球が黄色く光る元のデザイン */}
            <div className="opinion-item">
                <button type="button" className={`opinion-reaction${reacted ? " is-reacted" : ""}`} aria-label={`「${thread.title}」になるほど`}
                    aria-pressed={reacted} disabled={reactionPending[thread.id]} aria-busy={Boolean(reactionPending[thread.id])}
                    onClick={() => void toggleReaction(thread.id, reacted)}>
                    <svg key={`${reacted}-${reactionFlashes[thread.id] ?? 0}`} className={`reaction-bulb${reacted && reactionFlashes[thread.id] ? " is-flashing" : ""}`} width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M9 18h6M10 21h4M8 14a6 6 0 1 1 8 0c-1 1-1 2-1 4H9c0-2 0-3-1-4Z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M12 10v8M9.5 8.5 12 11l2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span>なるほど</span>
                </button>
                <div className={`opinion-row ${thread.stance === "agree" ? "blue" : "pink"}`}>
                    <span className="opinion-text"><DictionaryText>{thread.title}</DictionaryText></span>
                    {/* 縦線の右だけが開くボタン */}
                    <button type="button" className="opinion-open" aria-label={`「${thread.title}」の意見交換を開く`} onClick={() => props.selectThread(thread.id)}>
                        <span aria-hidden="true">＞</span>
                    </button>
                </div>
            </div>
            {reactionErrors[thread.id] && <p role="alert">{reactionErrors[thread.id]}</p>}
            </div>;
        })}</div>
        <button type="button" className="add-opinion" aria-label="意見を追加" onClick={() => props.navigate("new-thread")}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
                <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" />
            </svg>
        </button>
    </section>;
}
