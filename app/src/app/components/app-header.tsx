import type { DiscussionState } from "../hooks/use-discussion-state";
import "./app-header.css";
type Props = Pick<
  DiscussionState,
  | "navigate"
  | "screen"
  | "search"
  | "setSearch"
  | "selectedTopic"
  | "menuOpen"
  | "setMenuOpen"
  | "setCategory"
  | "setNotice"
>;
export default function AppHeader({
  navigate,
  screen,
  search,
  setSearch,
  selectedTopic,
  menuOpen,
  setMenuOpen,
  setCategory,
  setNotice,
}: Props) {
  return (
    <header className="app-header">
      <div className="header-top">
        <button className="brand" onClick={() => navigate("home")}>
          アプリ名
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
                {[selectedTopic.label, "消費税"]
                  .filter((label) => label.includes(search))
                  .map((label) => (
                    <button
                      key={label}
                      onClick={() =>
                        navigate(label === "消費税" ? "summary" : "topics")
                      }
                    >
                      {label}　&gt;
                    </button>
                  ))}
                {![selectedTopic.label, "消費税"].some((label) =>
                  label.includes(search),
                ) && <p>該当するトピックはありません</p>}
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
          <button onClick={() => setCategory(0)}>今日のテーマ</button>
          <button className="active" onClick={() => setCategory(0)}>
            お金
          </button>
          <button
            onClick={() =>
              setNotice("このデモでは「お金」のトピックを表示しています。")
            }
          >
            健康・福祉
          </button>
        </nav>
      ) : (
        <nav
          className={`breadcrumbs ${screen === "discussion" || screen === "thread" ? "pills" : ""}`}
          aria-label="現在の位置"
        >
          <button onClick={() => navigate("home")}>お金</button>
          <span>&gt;</span>
          <button
            aria-current={screen === "topics" ? "page" : undefined}
            onClick={() => navigate("topics")}
          >
            {selectedTopic.label}
          </button>
          {screen !== "topics" && (
            <>
              <span>&gt;</span>
              <button
                aria-current={screen === "summary" ? "page" : undefined}
                onClick={() => navigate("summary")}
              >
                消費税
              </button>
            </>
          )}
          {(screen === "discussion" || screen === "thread") && (
            <>
              <span>&gt;</span>
              <button
                aria-current={screen === "discussion" ? "page" : undefined}
                onClick={() => navigate("discussion")}
              >
                増税するべきか
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
