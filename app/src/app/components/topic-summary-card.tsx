import "../screens/summary-screen.css";

type Props = {
  color?: string;
  questionNumber: number;
  question: string;
  onDetail: () => void;
};

export default function TopicSummaryCard({
  color = "cream",
  questionNumber,
  question,
  onDetail,
}: Props) {
  return <article className={`summary-card ${color}`}>
    <div className="summary-heading">
      <h1>Q{questionNumber}. {question}</h1>
      <div className="summary-buttons">
        <button className="summary-vote" disabled title="投票はPhase 3で利用可能になります">
          投票準備中
        </button>
        <button className="summary-detail" onClick={onDetail}>詳細</button>
      </div>
    </div>
    <div className="summary-pending" role="note">
      <p>投票結果はPhase 3で表示します。</p>
      <p>スレッドはPhase 4で表示します。</p>
    </div>
  </article>;
}
