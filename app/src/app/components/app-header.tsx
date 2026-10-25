import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
  | "homeTab"
  | "setHomeTab"
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
  homeTab,
  setHomeTab,
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
  const categoryNavRef = useRef<HTMLElement>(null);
  // トップは「今日のテーマ」と「カテゴリー」の2つに分け、カテゴリーを押すと下に一覧を開く
  const [categoryMenuOpen, setCategoryMenuOpen] = useState(false);

  // 一覧の外を押すか Esc で閉じる
  useEffect(() => {
    if (!categoryMenuOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!categoryNavRef.current?.parentElement?.contains(event.target as Node)) setCategoryMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCategoryMenuOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [categoryMenuOpen]);

  // 選択中のタブの下線を1本の線として描き、切り替えたときに前のタブから横にすべらせる
  const indicatorRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = categoryNavRef.current;
    const indicator = indicatorRef.current;
    if (!nav || !indicator) return;
    const place = () => {
      const active = nav.querySelector<HTMLElement>(".active");
      indicator.style.opacity = active ? "1" : "0";
      if (!active) return;
      indicator.style.transform = `translateX(${active.offsetLeft}px)`;
      indicator.style.width = `${active.offsetWidth}px`;
    };
    place();
    // 最初の位置合わせではすべらせない
    const frame = requestAnimationFrame(() => indicator.classList.add("is-ready"));
    // フォントの読み込みや太字への切り替えでタブの幅が変わったら合わせ直す
    const observer = new ResizeObserver(place);
    nav.querySelectorAll("button").forEach((button) => observer.observe(button));
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [homeTab, screen]);

  const collapseMiddle = (screen === "discussion" || screen === "thread") && Boolean(selectedFrame);

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
          <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#454553" aria-hidden="true">
            <path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z" />
          </svg>
        </button>
      </div>
      {screen === "home" ? (
        <div className="category-nav-wrap">
          <nav ref={categoryNavRef} className="category-nav" aria-label="トップの表示切り替え">
            {/* 末尾に置くと button:last-child の指定が外れるため先頭に置く */}
            <span ref={indicatorRef} className="category-indicator" aria-hidden="true" />
            {/* 今日のテーマは別のコンテンツ。今ある分類はすべてカテゴリーに入る */}
            <button
              className={homeTab === "today" ? "active" : undefined}
              onClick={() => {
                setHomeTab("today");
                setCategoryMenuOpen(false);
              }}
            >
              今日のテーマ
            </button>
            <button
              className={homeTab === "category" ? "active" : undefined}
              aria-expanded={categoryMenuOpen}
              aria-controls="category-menu"
              onClick={() => setCategoryMenuOpen((open) => !open)}
            >
              カテゴリー
              <span className={`category-caret${categoryMenuOpen ? " is-open" : ""}`} aria-hidden="true">▾</span>
            </button>
          </nav>
          {categoryMenuOpen && (
            <ul id="category-menu" className="category-menu" aria-label="カテゴリー">
              {genres.map((genre) => (
                <li key={genre.id}>
                  <button
                    aria-current={homeTab === "category" && genre.id === selectedGenre?.id ? "true" : undefined}
                    onClick={() => {
                      setHomeTab("category");
                      setCategoryMenuOpen(false);
                      selectGenre(genre.id);
                    }}
                  >
                    {genre.name}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
          {/* 設問の画面では設問の文が長く横にはみ出すため、間の「中分類 › トピック」を「…」にまとめる。
              「…」を押すとトピック（設問一覧）へ戻る */}
          {collapseMiddle && topicDetail && (
            <>
              <span>&gt;</span>
              <button
                className="crumb-ellipsis"
                aria-label={`${selectedMiddleTopic ? `${selectedMiddleTopic.name} › ` : ""}${topicDetail.name}へ戻る`}
                title={`${selectedMiddleTopic ? `${selectedMiddleTopic.name} › ` : ""}${topicDetail.name}`}
                onClick={() => selectTopic(topicDetail.id)}
              >
                …
              </button>
            </>
          )}
          {!collapseMiddle && selectedMiddleTopic && (
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
          {!collapseMiddle && screen !== "topics" && topicDetail && (
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
                className="crumb-question"
                aria-current={screen === "discussion" ? "page" : undefined}
                title={selectedFrame.question}
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
