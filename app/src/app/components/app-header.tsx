import Image from "next/image";
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
  searchResults,
  selectGenre,
  selectMiddleTopic,
  selectTopic,
}: Props) {
  // 履歴ではなく階層で1つ上へ戻す。外から直接開いたときにアプリの外へ出ないようにするため。
  function goBack() {
    if (screen === "thread" || screen === "new-thread") navigate("discussion");
    else if (screen === "discussion" && topicDetail) selectTopic(topicDetail.id);
    else if (screen === "summary" && selectedMiddleTopic) selectMiddleTopic(selectedMiddleTopic.id);
    else if (selectedGenre) selectGenre(selectedGenre.id);
    else navigate("home");
  }
  return (
    <header className="app-header">
      <div className="header-top">
        <button className="brand" aria-label="Rights ホームへ" onClick={() => navigate("home")}>
          <Image src="/rights-mark.png" alt="" width={117} height={103} className="brand-mark" />
          <span aria-hidden="true">ights</span>
        </button>
        {screen === "home" && (
          <div className="search-wrap">
            <input
              aria-label="トピックを検索"
              placeholder="トピックを検索"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <span aria-hidden="true">⌕</span>
            {search && (
              <div className="search-results">
                {searchResults.map((result) => (
                  <button key={result.id} onClick={() => selectTopic(result.id)}>
                    {result.name}　&gt;
                  </button>
                ))}
                {searchResults.length === 0 && <p>該当するトピックはありません</p>}
              </div>
            )}
          </div>
        )}
        <button
          className="menu-button"
          aria-label={menuOpen ? "メニューを閉じる" : "メニューを開く"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      {screen === "home" ? (
        <nav className="category-nav" aria-label="カテゴリー">
          {genres.map((genre) => (
            <button
              key={genre.id}
              className={genre.id === selectedGenre?.id ? "active" : undefined}
              onClick={() => selectGenre(genre.id)}
            >
              {genre.name}
            </button>
          ))}
        </nav>
      ) : (
        <nav
          className={`breadcrumbs ${screen === "discussion" || screen === "thread" ? "pills" : ""}`}
          aria-label="現在の位置"
        >
          <button className="back-button" aria-label="1つ前の階層へ戻る" onClick={goBack}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {selectedGenre && (
            <button onClick={() => selectGenre(selectedGenre.id)}>{selectedGenre.name}</button>
          )}
          {selectedMiddleTopic && (
            <>
              <span>&gt;</span>
              <button
                aria-current={screen === "topics" ? "page" : undefined}
                onClick={() => selectMiddleTopic(selectedMiddleTopic.id)}
              >
                {selectedMiddleTopic.name}
              </button>
            </>
          )}
          {screen !== "topics" && topicDetail && (
            <>
              <span>&gt;</span>
              <button
                aria-current={screen === "summary" ? "page" : undefined}
                onClick={() => selectTopic(topicDetail.id)}
              >
                {topicDetail.name}
              </button>
            </>
          )}
          {(screen === "discussion" || screen === "thread") && selectedFrame && (
            <>
              <span>&gt;</span>
              <button
                aria-current={screen === "discussion" ? "page" : undefined}
                onClick={() => navigate("discussion")}
              >
                {selectedFrame.question}
              </button>
            </>
          )}
          {screen === "thread" && (
            <>
              <span>&gt;</span>
              <span className="current" aria-current="page">
                意見交換
              </span>
            </>
          )}
        </nav>
      )}
    </header>
  );
}
