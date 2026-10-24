"use client";

import Image from "next/image";
import { useEffect, useState, type FormEvent } from "react";
import taxImage from "./images/税金.svg";
import pricesImage from "./images/物価賃金.svg";
import budgetImage from "./images/国の財政.svg";
import financeImage from "./images/金融投資.svg";

type Screen = "home" | "topics" | "summary" | "discussion" | "thread" | "vote" | "video" | "login" | "register" | "profile";
const screens: Screen[] = ["home", "topics", "summary", "discussion", "thread", "vote", "video", "login", "register", "profile"];
const topics = [
  { label: "税金", image: taxImage },
  { label: "物価・賃金", image: pricesImage },
  { label: "国の財政", image: budgetImage },
  { label: "金融・投資", image: financeImage },
];
const opinionLabels = ["反対", "やや反対", "中立", "やや賛成", "賛成"];
const opinionColors = ["#ed5374", "#efa1b2", "#d9d9d9", "#83c6e9", "#49a3d3"];

export default function DiscussionApp() {
  const [screen, setScreen] = useState<Screen>("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState(0);
  const [stance, setStance] = useState("賛成");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ text: string; stance: string }[]>([]);
  const [vote, setVote] = useState<number | null>(null);
  const [notice, setNotice] = useState("");
  const [profile, setProfile] = useState({ phone: "", gender: "", year: "" });
  useEffect(() => {
    const syncScreen = () => {
      const hash = window.location.hash.slice(1);
      setScreen(screens.includes(hash as Screen) ? hash as Screen : "home");
      setMenuOpen(false);
    };
    syncScreen();
    window.addEventListener("hashchange", syncScreen);
    return () => window.removeEventListener("hashchange", syncScreen);
  }, []);
  function navigate(next: Screen) {
    window.location.hash = next;
    setScreen(next);
    setMenuOpen(false);
    setNotice("");
    window.scrollTo(0, 0);
  }
  function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (screen === "profile") {
      const data = new FormData(event.currentTarget);
      setProfile({ phone: String(data.get("phone") ?? ""), gender: String(data.get("gender") ?? ""), year: String(data.get("year") ?? "") });
      setNotice("会員情報を画面内で変更しました（デモ）。");
    } else {
      navigate("home");
      setNotice(screen === "register" ? "登録内容を確認しました（デモ）。" : "入力内容を確認しました（デモ）。");
    }
  }
  const accountScreen = screen === "login" || screen === "register" || screen === "profile";
  const selectedTopic = topics[category];
  return (
    <main className={`app-shell screen-${screen}`}>
      {!accountScreen && screen !== "video" && screen !== "vote" && <header className="app-header">
        <div className="header-top"><button className="brand" onClick={() => navigate("home")}>アプリ名</button>
          {screen === "home" && <div className="search-wrap"><input aria-label="トピックを検索" placeholder="トピックを検索" value={search} onChange={event => setSearch(event.target.value)} /><span aria-hidden="true">⌕</span>
            {search && <div className="search-results">{[selectedTopic.label, "消費税"].filter(label => label.includes(search)).map(label => <button key={label} onClick={() => navigate(label === "消費税" ? "summary" : "topics")}>{label}　&gt;</button>)}{![selectedTopic.label, "消費税"].some(label => label.includes(search)) && <p>該当するトピックはありません</p>}</div>}
          </div>}
          <button className="menu-button" aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"} aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}><span /><span /><span /></button>
        </div>
        {screen === "home" ? <nav className="category-nav" aria-label="カテゴリー"><button onClick={() => setCategory(0)}>今日のテーマ</button><button className="active" onClick={() => setCategory(0)}>お金</button><button onClick={() => setNotice("このデモでは「お金」のトピックを表示しています。")}>健康・福祉</button></nav> : <nav className={`breadcrumbs ${screen === "discussion" ? "pills" : ""}`} aria-label="現在の位置"><button onClick={() => navigate("home")}>お金</button><span>&gt;</span><button onClick={() => navigate("topics")}>{selectedTopic.label}</button>{screen !== "topics" && <><span>&gt;</span><button onClick={() => navigate("summary")}>消費税</button></>}{screen === "discussion" && <><span>&gt;</span><span className="current">増税するべきか</span></>}</nav>}
      </header>}
      {notice && <p className="notice" role="status">{notice}</p>}
      {screen === "home" && <div className="topic-grid">{topics.map((topic, index) => <button className="topic-tile" key={topic.label} onClick={() => { setCategory(index); navigate("topics"); }}><Image src={topic.image} alt="" width={150} height={150} priority /><span>{topic.label}</span></button>)}</div>}
      {screen === "topics" && <section className="middle-topics"><Image className="topic-hero" src={selectedTopic.image} alt={selectedTopic.label} width={150} height={150} priority />{["pink", "blue", "cream", "white"].map(color => <button className={`topic-row ${color}`} key={color} onClick={() => navigate("summary")}>消費税</button>)}</section>}
      {screen === "summary" && <section className="summaries">{["cream", "white", "blue"].map((color, index) => <article key={color} className={`summary-card ${color}`}><div className="summary-heading"><h1>Q1. 増税するべきか</h1><button className="discussion-link" onClick={() => navigate("discussion")}>議論へ</button></div><div className="summary-content"><div className="pie" role="img" aria-label="賛成50%、反対50%"><span>賛成<br />50%</span><span>反対<br />50%</span></div><table><thead><tr><th>賛成</th><th>反対</th></tr></thead><tbody>{[0, 1, 2].map(row => <tr key={row}><td><button aria-label={`議題${index + 1}の賛成意見${row + 1}`} onClick={() => navigate("thread")}>いいと思う！！</button></td><td><button aria-label={`議題${index + 1}の反対意見${row + 1}`} onClick={() => navigate("thread")}>良くないと思う</button></td></tr>)}</tbody></table></div></article>)}</section>}
      {screen === "discussion" && <section className="discussion-list"><h1>Q1. 増税するべきか</h1>{["生活苦しいから増税しないで", "お金余ってるから増税して", "生活苦しいから増税しないで"].map((text, index) => <button key={index} className={`opinion-row ${index === 1 ? "blue" : "pink"}`} onClick={() => navigate("thread")}>{text}<span>＞</span></button>)}</section>}
      {screen === "thread" && <section className="thread"><h1>Q1. 増税するべきか</h1><div className="message-list"><p className="bubble agree">増税したほうがいいよ！</p><p className="bubble agree own">私もそう思います。</p><p className="bubble disagree">私は反対です。</p>{messages.map((item, index) => <p key={index} className={`bubble own ${item.stance === "賛成" ? "agree" : "disagree"}`}>{item.text}</p>)}</div><button className="definition" onClick={() => navigate("video")}><span>消費税</span><small>商品を買うとかかるお金です</small></button><form className="composer" onSubmit={event => { event.preventDefault(); if (message.trim()) { setMessages([...messages, { text: message.trim(), stance }]); setMessage(""); } }}><div className="stance-switch">{["賛成", "反対"].map(label => <button type="button" key={label} className={stance === label ? `selected ${label === "賛成" ? "agree" : "disagree"}` : ""} aria-pressed={stance === label} onClick={() => setStance(label)}>{label}</button>)}</div><input aria-label="意見を入力" value={message} onChange={event => setMessage(event.target.value)} required /><button className="send" aria-label="意見を送信" type="submit">▶</button></form></section>}
      {screen === "video" && <section className="video-screen"><button className="close-video" aria-label="動画を閉じて投票へ" onClick={() => navigate("vote")}>×</button><div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）" /></section>}
      {screen === "vote" && <section className="vote-screen"><div className="video-placeholder" role="img" aria-label="動画表示エリア（動画素材未設定）" /><h1>Q. ああああああああ？</h1><p className="vote-date">3/2 変更可能</p><div className="vote-labels"><span>反対</span><span>賛成</span></div><div className="vote-options">{opinionLabels.map((label, index) => <button key={label} aria-label={label} aria-pressed={vote === index} className={`vote-dot ${vote === index ? "chosen" : ""}`} style={{ backgroundColor: opinionColors[index] }} onClick={() => setVote(index)} />)}</div>{vote !== null && <p className="vote-status" role="status">「{opinionLabels[vote]}」を選択しました</p>}<div className="vote-actions"><button className="primary" onClick={() => navigate("summary")}>トピックへ</button><button className="secondary" onClick={() => navigate("home")}>ホームへ</button></div></section>}
      {accountScreen && <section className={`account-screen ${screen === "login" ? "login-screen" : ""}`}>
        {screen === "login" && <><div className="avatar-placeholder" /><h1>ログイン</h1></>}
        <form key={screen} onSubmit={submitAccount}>
          <label className="account-field">{screen !== "login" && <span>電話番号</span>}<input name="phone" aria-label="電話番号" type="tel" autoComplete="tel" placeholder={screen === "login" ? "電話番号" : ""} defaultValue={screen === "profile" ? profile.phone : ""} required pattern="[0-9０-９+\- ()]{10,15}" /></label>
          <label className="account-field">{screen !== "login" && <span>パスワード</span>}<input name="password" aria-label="パスワード" type="password" autoComplete={screen === "register" ? "new-password" : "current-password"} placeholder={screen === "login" ? "パスワード" : ""} required={screen !== "profile"} minLength={8} /></label>
          {screen !== "login" && <><fieldset className="gender-field"><legend>性別</legend>{["男性", "女性", "その他"].map(label => <label key={label}><input type="radio" name="gender" value={label} defaultChecked={screen === "profile" && profile.gender === label} required />{label}</label>)}</fieldset><label className="year-field"><span>生まれた年</span><select aria-label="生まれた年" name="year" defaultValue={screen === "profile" ? profile.year : ""} required><option value="" disabled></option>{Array.from({ length: 127 }, (_, index) => 2026 - index).map(year => <option value={year} key={year}>{year}年</option>)}</select></label></>}
          <div className="account-actions"><button className="primary" type="submit">{screen === "login" ? "ログイン" : screen === "register" ? "新規登録" : "変更"}</button>{screen === "profile" && <button type="button" className="secondary" onClick={() => navigate("home")}>キャンセル</button>}</div>
        </form>
        {screen === "login" && <div className="login-links"><button onClick={() => navigate("register")}>新規登録はこちら</button><button onClick={() => setNotice("パスワード再設定はデモでは利用できません。")}>パスワードを忘れた方</button></div>}
      </section>}
      {menuOpen && <><button className="menu-scrim" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} /><nav className="drawer" aria-label="メニュー"><button onClick={() => navigate("profile")}>会員情報変更</button><button onClick={() => navigate("login")}>ログイン</button><button onClick={() => navigate("register")}>新規登録</button><button onClick={() => navigate("video")}>動画・投票</button><button onClick={() => navigate("home")}>ホームへ</button></nav></>}
    </main>
  );
}


