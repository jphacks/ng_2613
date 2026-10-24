import type { DiscussionState } from "../hooks/use-discussion-state";
import "./summary-screen.css";
type Props = Pick<DiscussionState, "navigate">;
export default function SummaryScreen({ navigate }: Props) {
    return (<section className="summaries">{["cream", "white", "blue"].map((color, index) => <article key={color} className={`summary-card ${color}`}>
        <div className="summary-heading">
        <h1>Q1. 増税するべきか</h1>
        <button className="discussion-link" onClick={() => navigate("discussion")}>議論へ</button>
        </div>
        <div className="summary-content">
        <div className="pie" role="img" aria-label="賛成50%、反対50%">
        <span>賛成<br />50%</span>
        <span>反対<br />50%</span>
        </div>
        <table>
        <thead>
        <tr>
        <th>賛成</th>
        <th>反対</th>
        </tr>
        </thead>
        <tbody>{[0, 1, 2].map(row => <tr key={row}>
            <td>
            <button aria-label={`議題${index + 1}の賛成意見${row + 1}`} onClick={() => navigate("thread")}>いいと思う！！</button>
            </td>
            <td>
            <button aria-label={`議題${index + 1}の反対意見${row + 1}`} onClick={() => navigate("thread")}>良くないと思う</button>
            </td>
            </tr>)}</tbody>
        </table>
        </div>
        </article>)}</section>);
}
