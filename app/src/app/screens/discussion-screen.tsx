import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./discussion-screen.css";

type Props = Pick<DiscussionState,
  | "selectedFrame" | "topicDetail" | "topicStatus" | "topicError" | "retryTopic" | "navigate"
  | "threads" | "threadsStatus" | "threadsError" | "retryThreads" | "selectThread"
>;

export default function DiscussionScreen(props: Props) {
  if (props.topicStatus !== "success") {
    return <DataState
      status={props.topicStatus}
      error={props.topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={props.retryTopic}
      onLogin={() => props.navigate("login")}
    />;
  }
  if (!props.selectedFrame || !props.topicDetail) {
    return <div className="data-state" role="alert">指定された設問が見つかりません。</div>;
  }

  return <section className="discussion-list">
    <article className="question-detail">
      <p className="question-topic">{props.topicDetail.name}</p>
      <h1>{props.selectedFrame.question}</h1>
    </article>
    <div className="discussion-opinions" aria-labelledby="discussion-opinions-heading">
      <h2 id="discussion-opinions-heading">みんなの意見</h2>
      {props.threadsStatus === "loading" || props.threadsStatus === "idle"
        ? <p className="data-state" role="status">読み込み中…</p>
        : props.threadsStatus === "error"
          ? <div className="data-state" role="alert">
              <p>{props.threadsError}</p>
              <button className="secondary" onClick={props.retryThreads}>再試行</button>
            </div>
          : props.threadsStatus === "empty"
            ? <p className="data-state">まだスレッドはありません。</p>
            : props.threads.map((thread) => <button
                className={`opinion-row ${thread.stance}`}
                key={thread.id}
                onClick={() => props.selectThread(thread.id)}
              >
                <span>{thread.title}</span>
                <small>{thread.author.username}・{new Date(thread.createdAt).toLocaleDateString("ja-JP")}</small>
              </button>)}
    </div>
    <button
      type="button"
      className="add-opinion"
      aria-label="意見を追加"
      onClick={() => props.navigate("new-thread")}
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    </button>
  </section>;
}
