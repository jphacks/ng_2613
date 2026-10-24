"use client";

import { useState, type FormEvent } from "react";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import type { PostStance } from "../lib/threads/types";
import "./thread-screen.css";

type Props = Pick<DiscussionState,
  | "threadDetail" | "threadDetailStatus" | "threadDetailError" | "retryThreadDetail"
  | "commentSubmitting" | "commentSubmitError" | "submitComment" | "navigate"
>;

export default function ThreadScreen(props: Props) {
  const [message, setMessage] = useState("");
  const [stance, setStance] = useState<PostStance>("agree");

  if (props.threadDetailStatus !== "success" || !props.threadDetail) {
    return <DataState status={props.threadDetailStatus} error={props.threadDetailError}
      emptyMessage="スレッドが見つかりません。" onRetry={props.retryThreadDetail}
      onLogin={() => props.navigate("login")} />;
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
      {thread.comments.map((comment) => <article key={comment.id}
        className={`bubble ${comment.stance ?? ""}`}>
        <p>{comment.body}</p>
        <small>{comment.author.username}・{new Date(comment.createdAt).toLocaleString("ja-JP")}</small>
      </article>)}
    </div>
    <form className="composer" onSubmit={(event) => void submit(event)}>
      <div className="stance-switch">
        {(["agree", "disagree"] as const).map((value) => <button type="button" key={value}
          className={stance === value ? `selected ${value}` : ""} aria-pressed={stance === value}
          onClick={() => setStance(value)}>{value === "agree" ? "賛成" : "反対"}</button>)}
      </div>
      <input aria-label="コメントを入力" maxLength={2000} value={message}
        onChange={(event) => setMessage(event.target.value)} required />
      <button className="send" aria-label="コメントを送信" disabled={props.commentSubmitting}>▶</button>
      {props.commentSubmitError && <p className="composer-error" role="alert">{props.commentSubmitError}</p>}
    </form>
  </section>;
}
