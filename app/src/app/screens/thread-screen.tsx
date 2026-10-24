import type { DiscussionState } from "../hooks/use-discussion-state";
import "./thread-screen.css";
type Props = Pick<DiscussionState, "messages" | "message" | "stance" | "setStance" | "setMessages" | "setMessage" | "navigate">;
export default function ThreadScreen({ messages, message, stance, setStance, setMessages, setMessage, navigate }: Props) {
    return (<section className="thread">
    <h1>Q1. 増税するべきか</h1>
    <div className="message-list">
    <p className="bubble agree">増税したほうがいいよ！</p>
    <p className="bubble agree own">私もそう思います。</p>
    <p className="bubble disagree">私は反対です。</p>{messages.map((item, index) => <p key={index} className={`bubble own ${item.stance === "賛成" ? "agree" : "disagree"}`}>{item.text}</p>)}</div>
    <button className="definition" onClick={() => navigate("video")}>
    <span>消費税</span>
    <small>商品を買うとかかるお金です</small>
    </button>
    <form className="composer" onSubmit={event => { event.preventDefault(); if (message.trim()) {
        setMessages([...messages, { text: message.trim(), stance }]);
        setMessage("");
    } }}>
    <div className="stance-switch">{["賛成", "反対"].map(label => <button type="button" key={label} className={stance === label ? `selected ${label === "賛成" ? "agree" : "disagree"}` : ""} aria-pressed={stance === label} onClick={() => setStance(label)}>{label}</button>)}</div>
    <input aria-label="意見を入力" value={message} onChange={event => setMessage(event.target.value)} required/>
    <button className="send" aria-label="意見を送信" type="submit">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="33" height="33" fill="currentColor" aria-hidden="true" focusable="false">
            <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
        </svg>
    </button>
    </form>
    </section>);
}
