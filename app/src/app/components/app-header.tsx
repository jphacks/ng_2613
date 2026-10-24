import type { DiscussionState } from "../hooks/use-discussion-state";
import "./app-header.css";

type Props = Pick<
  DiscussionState,
  | "navigate" | "screen" | "search" | "setSearch" | "menuOpen" | "setMenuOpen"
  | "genres" | "selectedGenre" | "selectedMiddleTopic" | "topicDetail" | "selectedFrame"
  | "catalogStatus" | "searchResults" | "selectGenre" | "selectMiddleTopic" | "selectTopic"
>;

export default function AppHeader(props: Props) {
  const detailScreen = props.screen === "discussion" || props.screen === "new-thread" || props.screen === "thread";

  return <header className="app-header">
    <div className="header-top">
      <button
        className="brand"
        onClick={() => props.selectedGenre ? props.selectGenre(props.selectedGenre.id) : props.navigate("home")}
      >Rights</button>
      {props.screen === "home" && <div className="search-wrap">
        <input
          aria-label="トピックを検索"
          placeholder="トピックを検索"
          value={props.search}
          onChange={(event) => props.setSearch(event.target.value)}
          disabled={props.catalogStatus !== "success"}
        />
        <span aria-hidden="true">⌕</span>
        {props.search && props.catalogStatus === "success" && <div className="search-results">
          {props.searchResults.map((result) => <button key={result.id} onClick={() => props.selectTopic(result.id)}>
            <span>{result.name}</span>
            <small>{result.genreName} &gt; {result.middleTopicName}</small>
          </button>)}
          {props.searchResults.length === 0 && <p>該当するトピックはありません</p>}
        </div>}
      </div>}
      <button
        className="menu-button"
        aria-label={props.menuOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={props.menuOpen}
        onClick={() => props.setMenuOpen(!props.menuOpen)}
      ><span /><span /><span /></button>
    </div>
    {props.screen === "home"
      ? <nav className="category-nav" aria-label="ジャンル">
          {props.genres.map((genre) => <button
            key={genre.id}
            className={genre.id === props.selectedGenre?.id ? "active" : ""}
            onClick={() => props.selectGenre(genre.id)}
          >{genre.name}</button>)}
        </nav>
      : <nav className={`breadcrumbs ${detailScreen ? "pills" : ""}`} aria-label="現在の位置">
          {props.selectedGenre && <button onClick={() => props.selectGenre(props.selectedGenre.id)}>{props.selectedGenre.name}</button>}
          {props.selectedMiddleTopic && <>
            <span>&gt;</span>
            <button onClick={() => props.selectMiddleTopic(props.selectedMiddleTopic!.id)}>{props.selectedMiddleTopic.name}</button>
          </>}
          {props.topicDetail && <>
            <span>&gt;</span>
            <button onClick={() => props.selectTopic(props.topicDetail!.id)}>{props.topicDetail.name}</button>
          </>}
          {detailScreen && props.selectedFrame && <>
            <span>&gt;</span>
            <button onClick={() => props.navigate("discussion")}>設問詳細</button>
          </>}
          {props.screen === "new-thread" && <><span>&gt;</span><span className="current">投稿</span></>}
          {props.screen === "thread" && <><span>&gt;</span><span className="current">意見交換</span></>}
        </nav>}
  </header>;
}
