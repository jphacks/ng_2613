import { DictionaryText } from "../components/dictionary";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./thread-screen.css";
import { avatarColors, randomAvatarColor, usernameInitial } from "../lib/avatar";
type Props = Pick<DiscussionState, "profile" | "messages" | "message" | "stance" | "setStance" | "setMessages" | "setMessage" | "navigate"> & { showDemoMessages?: boolean };
export default function ThreadScreen({ profile, messages, message, stance, setStance, setMessages, setMessage, showDemoMessages = true }: Props) {
    const username = profile.username || "ゲスト";
    const guestColor = messages[0]?.avatarColor || avatarColors[0];
    function renderMessage(item: DiscussionState["messages"][number], key: string | number, own = false) {
        return <div key={key} className={`message-row${own ? " own" : ""}`}>
            <span className="sender-avatar" style={{ backgroundColor: item.avatarColor }} role="img" aria-label={`${item.username}のアイコン`}>{usernameInitial(item.username)}</span>
            <div className="message-content">
                <span className="sender-name">{item.username}</span>
                <p className={`bubble ${item.stance === "賛成" ? "agree" : "disagree"}`}><DictionaryText>{item.text}</DictionaryText></p>
            </div>
        </div>;
    }
    return (<section className="thread">
    <h1>Q1. 増税するべきか</h1>
    <div className="message-list">
    {showDemoMessages && <>
        {renderMessage({ text: "増税したほうがいいよ！", stance: "賛成", username: "さくら", avatarColor: avatarColors[4] }, "demo-1")}
        {renderMessage({ text: "私もそう思います。", stance: "賛成", username, avatarColor: profile.avatarColor || guestColor }, "demo-2", true)}
        {renderMessage({ text: "私は反対です。", stance: "反対", username: "たろう", avatarColor: avatarColors[1] }, "demo-3")}
    </>}{messages.map((item, index) => renderMessage(item, index, true))}</div>
    <form className="composer" onSubmit={event => { event.preventDefault(); if (message.trim()) {
        setMessages([...messages, { text: message.trim(), stance, username, avatarColor: profile.avatarColor || messages[0]?.avatarColor || randomAvatarColor() }]);
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
