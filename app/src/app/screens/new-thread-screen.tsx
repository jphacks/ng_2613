"use client";

import { useState, type FormEvent } from "react";
import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import type { PostStance } from "../lib/threads/types";
import "./discussion-screen.css";

type Props = Pick<DiscussionState,
  | "selectedFrame" | "topicStatus" | "topicError" | "retryTopic" | "navigate"
  | "threadSubmitting" | "threadSubmitError" | "createDiscussionThread"
>;

export default function NewThreadScreen(props: Props) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [stance, setStance] = useState<PostStance>("agree");

  if (props.topicStatus !== "success") {
    return <DataState
      status={props.topicStatus}
      error={props.topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={props.retryTopic}
      onLogin={() => props.navigate("login")}
    />;
  }
  if (!props.selectedFrame) {
    return <div className="data-state" role="alert">指定された設問が見つかりません。</div>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await props.createDiscussionThread({ title, body, stance });
  }

  return <section className="discussion-list">
    <article className="question-detail"><h1>{props.selectedFrame.question}</h1></article>
    <form className="thread-create" onSubmit={(event) => void submit(event)}>
      <h2>意見を投稿</h2>
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
        aria-label="スレッドのタイトル"
        placeholder="タイトル"
        maxLength={120}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        required
      />
      <textarea
        aria-label="スレッドの本文"
        placeholder="本文"
        maxLength={5000}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        required
      />
      {props.threadSubmitError && <p className="post-error" role="alert">{props.threadSubmitError}</p>}
      <button className="primary" disabled={props.threadSubmitting}>
        {props.threadSubmitting ? "投稿中…" : "投稿する"}
      </button>
    </form>
  </section>;
}
