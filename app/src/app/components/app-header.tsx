import type { DiscussionState } from "../hooks/use-discussion-state";
import "./app-header.css";

type Props = Pick<
  DiscussionState,
  | "navigate"
  | "screen"
  | "search"
  | "setSearch"
  | "menuOpen"
  | "setMenuOpen"
  | "genres"
  | "selectedGenre"
  | "selectedMiddleTopic"
  | "topicDetail"
  | "selectedFrame"
  | "catalogStatus"
  | "searchResults"
  | "selectGenre"
  | "selectMiddleTopic"
  | "selectTopic"
>;

export default function AppHeader({
  navigate,
  screen,
  search,
  setSearch,
  menuOpen,
  setMenuOpen,
  genres,
  selectedGenre,
  selectedMiddleTopic,
  topicDetail,
  selectedFrame,
  catalogStatus,
  searchResults,
  selectGenre,
  selectMiddleTopic,
  selectTopic,
}: Props) {
  return <header className="app-header">
    <div className="header-top">
      <button
        className="brand"
        onClick={() => selectedGenre ? selectGenre(selectedGenre.id) : navigate("home")}
      >Rights</button>
      {screen === "home" && <div className="search-wrap">
        <input
          aria-label="トピックを検索"
          placeholder="トピックを検索"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          disabled={catalogStatus !== "success"}
        />
        <span aria-hidden="true">⌕</span>
        {search && catalogStatus === "success" && <div className="search-results">
          {searchResults.map((result) => <button key={result.id} onClick={() => selectTopic(result.id)}>
            <span>{result.name}</span>
            <small>{result.genreName} &gt; {result.middleTopicName}</small>
          </button>)}
          {searchResults.length === 0 && <p>該当するトピックはありません</p>}
        </div>}
      </div>}
      <button
        className="menu-button"
        aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen(!menuOpen)}
      >
        <span /><span /><span />
      </button>
    </div>
    {screen === "home"
      ? <nav className="category-nav" aria-label="ジャンル">
          {genres.map((genre) => <button
            key={genre.id}
            className={genre.id === selectedGenre?.id ? "active" : ""}
            onClick={() => selectGenre(genre.id)}
          >{genre.name}</button>)}
        </nav>
      : <nav className={`breadcrumbs ${screen === "discussion" ? "pills" : ""}`} aria-label="現在の位置">
          {selectedGenre && <button onClick={() => selectGenre(selectedGenre.id)}>{selectedGenre.name}</button>}
          {selectedMiddleTopic && <>
            <span>&gt;</span>
            <button onClick={() => selectMiddleTopic(selectedMiddleTopic.id)}>{selectedMiddleTopic.name}</button>
          </>}
          {topicDetail && <>
            <span>&gt;</span>
            <button onClick={() => selectTopic(topicDetail.id)}>{topicDetail.name}</button>
          </>}
          {screen === "discussion" && selectedFrame && <>
            <span>&gt;</span>
            <span className="current">設問詳細</span>
          </>}
        </nav>}
  </header>;
}
