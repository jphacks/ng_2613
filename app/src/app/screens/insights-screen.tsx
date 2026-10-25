import { mockInsights, type InsightRank } from "../lib/insights/mock";
import "./insights-screen.css";

function RankList({ items, kind }: { items: InsightRank[]; kind: "value" | "party" }) {
  return (
    <ol className={`insight-list ${kind}`}>
      {items.map((item, index) => (
        <li key={item.name} className="insight-item">
          <span className="insight-rank" aria-label={`${index + 1}位`}>{index + 1}</span>
          <div className="insight-body">
            <div className="insight-head">
              <strong>{item.name}</strong>
              <span className="insight-score">{item.score}%</span>
            </div>
            <span className="insight-meter" aria-hidden="true"><span style={{ width: `${item.score}%` }} /></span>
            <p>{item.description}</p>
            <ul className="insight-reasons">
              {item.reasons.map((reason) => <li key={reason}>{reason}</li>)}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
}

// 自分の投票から、大事にしている信条と考えが近い政党を3位まで出す（今はモック）
export default function InsightsScreen() {
  return (
    <section className="insights">
      <h1>あなたの傾向</h1>
      <p className="insights-lead">これまでの投票 {mockInsights.voteCount}件から見えてきたことです。</p>
      <h2>大事にしている信条</h2>
      <RankList items={mockInsights.values} kind="value" />
      <h2>考えが近い政党</h2>
      <RankList items={mockInsights.parties} kind="party" />
      <p className="insights-note">
        今はモックです。実際の投票は見ず、決まった結果を出しています。政党の名前と数値は仮のもので、特定の政党をすすめるものではありません。
      </p>
    </section>
  );
}
