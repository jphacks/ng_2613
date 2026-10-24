import DataState from "../components/data-state";
import TopicSummaryCard from "../components/topic-summary-card";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./summary-screen.css";

type Props = Pick<
  DiscussionState,
  "topicDetail" | "topicStatus" | "topicError" | "retryTopic" | "navigate" | "selectFrame"
>;
const colors = ["cream", "white", "blue"];

export default function SummaryScreen({
  topicDetail,
  topicStatus,
  topicError,
  retryTopic,
  navigate,
  selectFrame,
}: Props) {
  if (topicStatus !== "success" || !topicDetail) {
    return <DataState
      status={topicStatus}
      error={topicError}
      emptyMessage="このトピックには設問がありません。"
      onRetry={retryTopic}
      onLogin={() => navigate("login")}
    />;
  }

  return <section className="summaries">
    {topicDetail.description && <p className="topic-description">{topicDetail.description}</p>}
    {topicDetail.periods.map((period, periodIndex) => period.frames.length > 0 && <section key={period.id} className="period-group">
      <h2 className="period-heading">
        {period.code}
        <span>{period.status === "active" ? "実施中" : "終了"}</span>
      </h2>
      {period.frames.map((frame, index) => {
        const questionNumber = topicDetail.periods
          .slice(0, periodIndex)
          .reduce((count, previousPeriod) => count + previousPeriod.frames.length, 0) + index + 1;
        return <TopicSummaryCard
          key={frame.id}
          color={colors[(questionNumber - 1) % colors.length]}
          questionNumber={questionNumber}
          question={frame.question}
          onDetail={() => selectFrame(frame.id)}
        />;
      })}
    </section>)}
  </section>;
}
