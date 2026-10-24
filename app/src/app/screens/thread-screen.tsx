"use client";

import { useState, type FormEvent } from "react";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import { avatarColors, usernameInitial } from "../lib/avatar";
import type { PostStance } from "../lib/threads/types";
import "./thread-screen.css";

type Props = Pick<DiscussionState,
  | "threadDetail" | "threadDetailStatus" | "threadDetailError" | "retryThreadDetail"
  | "commentSubmitting" | "commentSubmitError" | "submitComment" | "navigate"
>;

function avatarColor(id: string) {
  const total = Array.from(id).reduce((sum, character) => sum + character.codePointAt(0)!, 0);
  return avatarColors[total % avatarColors.length];
}

export default function ThreadScreen(props: Props) {
  const [message, setMessage] = useState("");
  const [stance, setStance] = useState<PostStance>("agree");

  if (props.threadDetailStatus !== "success" || !props.threadDetail) {
    return <DataState
      status={props.threadDetailStatus}
      error={props.threadDetailError}
      emptyMessage="スレッドが見つかりません。"
      onRetry={props.retryThreadDetail}
      onLogin={() => props.navigate("login")}
    />;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await props.submitComment({ body: message, stance })) setMessage("");
  }

  const thread = props.threadDetail;
  return <section className="thread">
    <article className={`thread-body ${thread.stance}`}>
      <h1>{thread.title}</h1>
      <p>{thread.body}</p>
      <small>{thread.author.username}・{new Date(thread.createdAt).toLocaleString("ja-JP")}</small>
    </article>
    <div className="message-list">
      {thread.comments.length === 0 && <p className="thread-empty">まだコメントはありません。</p>}
      {thread.comments.map((comment) => <article className="message-row" key={comment.id}>
        <span
          className="sender-avatar"
          style={{ backgroundColor: avatarColor(comment.author.id) }}
          role="img"
          aria-label={`${comment.author.username}のアイコン`}
        >{usernameInitial(comment.author.username)}</span>
        <div className="message-content">
          <span className="sender-name">{comment.author.username}</span>
          <div className={`bubble ${comment.stance ?? ""}`}>
            <p>{comment.body}</p>
            <small>{new Date(comment.createdAt).toLocaleString("ja-JP")}</small>
          </div>
        </div>
      </article>)}
    </div>
    <button className="definition" onClick={() => props.navigate("video")}>
      <span>解説動画</span>
      <small>設問を動画で確認する</small>
    </button>
    <form className="composer" onSubmit={(event) => void submit(event)}>
      <div className="stance-switch">
        {(["agree", "disagree"] as const).map((value) => <button
          type="button"
          key={value}
          className={stance === value ? `selected ${value}` : ""}
          aria-pressed={stance === value}
          onClick={() => setStance(value)}
        >{value === "agree" ? "賛成" : "反対"}</button>)}
      </div>
      <input
        aria-label="コメントを入力"
        maxLength={2000}
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        required
      />
      <button className="send" aria-label="コメントを送信" disabled={props.commentSubmitting}>
        <svg viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true">
          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
      </button>
      {props.commentSubmitError && <p className="composer-error" role="alert">{props.commentSubmitError}</p>}
    </form>
  </section>;
}
