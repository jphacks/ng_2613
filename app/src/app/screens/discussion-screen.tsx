import DataState from "../components/data-state";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./discussion-screen.css";

type Props = Pick<
  DiscussionState,
  "selectedFrame" | "topicDetail" | "topicStatus" | "topicError" | "retryTopic" | "navigate"
>;

export default function DiscussionScreen({
  selectedFrame,
  topicDetail,
  topicStatus,
  topicError,
  retryTopic,
  navigate,
}: Props) {
  if (topicStatus !== "success") {
    return <DataState
      status={topicStatus}
      error={topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={retryTopic}
      onLogin={() => navigate("login")}
    />;
  }
  if (!selectedFrame || !topicDetail) {
    return <div className="data-state" role="alert">
      <p>指定された設問が見つかりません。</p>
      <button className="secondary" onClick={() => navigate("summary")}>設問一覧へ</button>
    </div>;
  }

  return <section className="discussion-list">
    <article className="question-detail">
      <p className="question-topic">{topicDetail.name}</p>
      <h1>{selectedFrame.question}</h1>
      <p className="feature-pending">投票は設問一覧から行えます。スレッド機能はPhase 4で利用可能になります。</p>
    </article>
  </section>;
}
