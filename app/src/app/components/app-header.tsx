import Image from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
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
  const categoryNavRef = useRef<HTMLElement>(null);

  // カテゴリーは横に並びきらず横スクロールになるため、選んだものが端で切れていたら見える位置まで寄せる
  useEffect(() => {
    categoryNavRef.current
      ?.querySelector(".active")
      ?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [selectedGenre?.id]);

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
  }, [selectedGenre?.id, genres, screen]);

  // スクロールバーは隠しているので、続きがある側の端を薄くして「まだ続く」ことを見せる。
  // マウスでは横スクロールの手段がなくなるため、ホイールと、つかんで引っぱる操作でスクロールできるようにする。
  useEffect(() => {
    const nav = categoryNavRef.current;
    if (!nav) return;
    const updateFade = () => {
      nav.toggleAttribute("data-fade-left", nav.scrollLeft > 1);
      nav.toggleAttribute("data-fade-right", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 1);
    };
    let drag: { startX: number; startScroll: number; moved: boolean } | null = null;
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      drag = { startX: event.clientX, startScroll: nav.scrollLeft, moved: false };
    };
    const onPointerMove = (event: PointerEvent) => {
      if (!drag) return;
      const distance = event.clientX - drag.startX;
      if (Math.abs(distance) > 4) {
        drag.moved = true;
        nav.classList.add("is-dragging");
      }
      if (drag.moved) nav.scrollLeft = drag.startScroll - distance;
    };
    const onPointerUp = () => {
      nav.classList.remove("is-dragging");
      // 引っぱったあとに指を離したときは、タブを押した扱いにしない
      if (drag?.moved) nav.addEventListener("click", cancelClick, { capture: true, once: true });
      drag = null;
    };
    // 縦ホイールを横スクロールに変える。端まで来たらページの縦スクロールに任せる
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const atStart = nav.scrollLeft <= 0 && event.deltaY < 0;
      const atEnd = nav.scrollLeft + nav.clientWidth >= nav.scrollWidth - 1 && event.deltaY > 0;
      if (atStart || atEnd) return;
      event.preventDefault();
      nav.scrollLeft += event.deltaY;
    };
    const cancelClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };
    updateFade();
    const observer = new ResizeObserver(updateFade);
    observer.observe(nav);
    nav.addEventListener("scroll", updateFade, { passive: true });
    nav.addEventListener("pointerdown", onPointerDown);
    nav.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      observer.disconnect();
      nav.removeEventListener("scroll", updateFade);
      nav.removeEventListener("pointerdown", onPointerDown);
      nav.removeEventListener("wheel", onWheel);
      nav.removeEventListener("click", cancelClick, { capture: true });
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [screen, genres]);

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
        <nav ref={categoryNavRef} className="category-nav" aria-label="カテゴリー">
          {/* 末尾に置くと button:last-child の指定が外れるため先頭に置く */}
          <span ref={indicatorRef} className="category-indicator" aria-hidden="true" />
          {/* 元のデザインと同じく、専用のデータはまだないため先頭のカテゴリーを表示する */}
          {genres[0] && <button onClick={() => selectGenre(genres[0].id)}>今日のテーマ</button>}
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
