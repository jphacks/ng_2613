import { useEffect, useId, useRef, useState } from "react";
import { mockSproutReply, sproutChatGreeting, type SproutChatMessage } from "../lib/sprout-chat/mock";
import type { ThreadSummary } from "../lib/threads/types";
import "./sprout-chat.css";

type Props = {
  threads: ThreadSummary[];
  onThread: (threadId: string) => void;
};

// AI の返事を待つあいだの時間（モックなので見せるためだけの待ち）
const replyDelayMilliseconds = 900;

function SproutIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M12 21v-8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 13c0-3.5-2.5-6-7-6 0 4 2.5 6 7 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 11c0-3.5 2.5-6 7-6 0 4-2.5 6-7 6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

// 意見が定まっていない人が、芽生えのマークから AI と話しながら考えを整理する（今はモック）
export default function SproutChat({ threads, onThread }: Props) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SproutChatMessage[]>([{ id: 0, from: "ai", text: sproutChatGreeting }]);
  const [draft, setDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const turn = useRef(0);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logEnd = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const threadById = new Map(threads.map((thread) => [thread.id, thread]));

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // 新しい発言が来たら一番下まで送る
  useEffect(() => {
    logEnd.current?.scrollIntoView({ block: "end" });
  }, [messages, replying, open]);

  useEffect(() => {
    if (!open) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function send() {
    const text = draft.trim();
    if (!text || replying) return;
    setMessages((current) => [...current, { id: nextId.current++, from: "user", text }]);
    setDraft("");
    setReplying(true);
    timer.current = setTimeout(() => {
      const replies = mockSproutReply(text, turn.current, threads).map((reply) => ({ ...reply, id: nextId.current++ }));
      turn.current += 1;
      setMessages((current) => [...current, ...replies]);
      setReplying(false);
    }, replyDelayMilliseconds);
  }

  return <>
    <button type="button" className="sprout-open" aria-label="AIと話して考えを整理する" aria-expanded={open} onClick={() => setOpen(true)}>
      <SproutIcon />
    </button>
    {open && <>
      <button type="button" className="sprout-scrim" aria-label="AIとの対話を閉じる" onClick={() => setOpen(false)} />
      <section className="sprout-chat" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <header className="sprout-chat-header">
          <span className="sprout-chat-icon"><SproutIcon /></span>
          <h2 id={titleId}>AIと考えを整理する</h2>
          <button type="button" className="sprout-close" aria-label="閉じる" onClick={() => setOpen(false)}>×</button>
        </header>
        <div className="sprout-log" aria-live="polite">
          {messages.map((message) => (
            <div key={message.id} className={`sprout-message from-${message.from}`}>
              <p>{message.text}</p>
              {/* AI が挙げた実際の意見。「この意見が気になる」でその意見交換のチャットへ移る */}
              {message.threadIds?.map((threadId) => {
                const thread = threadById.get(threadId);
                return thread && (
                  <div key={threadId} className={`sprout-post ${thread.stance}`}>
                    <span className="sprout-post-stance">{thread.stance === "agree" ? "賛成" : "反対"}</span>
                    <p className="sprout-post-title">{thread.title}</p>
                    <button type="button" className="sprout-curious" onClick={() => onThread(threadId)}>
                      <SproutIcon size={14} />この意見が気になる
                    </button>
                  </div>
                );
              })}
            </div>
          ))}
          {replying && <div className="sprout-message from-ai sprout-typing" aria-label="AIが考えています"><span /><span /><span /></div>}
          <div ref={logEnd} />
        </div>
        <form className="sprout-input" onSubmit={(event) => { event.preventDefault(); send(); }}>
          <input value={draft} maxLength={300} placeholder="思っていることを書く" aria-label="AIに送る文" onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" disabled={!draft.trim() || replying}>送る</button>
        </form>
        <p className="sprout-note">今はモックです。AIは呼ばず、決まった答えを返します。</p>
      </section>
    </>}
  </>;
}
