"use client";

import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import "./dictionary.css";

const entries = [
  { term: "消費税", definition: "商品を買うとかかるお金です" },
];
const DictionaryContext = createContext<(term: string, anchor: HTMLElement) => void>(() => {});

type Popover = { term: string; definition: string; top: number; left: number; placement: "below" | "above" };

const lensSize = 48;
const margin = 8;
// 解説の吹き出しの幅。画面の端からはみ出さないよう位置の計算にも使う
const popoverWidth = 220;

// 虫眼鏡のレンズの中心（下の SVG の円の中心 20,20 / 48）。ここが重なった言葉を調べる
function lensPoint(rect: DOMRect) {
  return { x: rect.left + rect.width * (20 / 48), y: rect.top + rect.height * (20 / 48) };
}

function termAt(x: number, y: number) {
  for (const element of document.elementsFromPoint(x, y)) {
    const term = element.closest<HTMLElement>(".dictionary-term[data-term]");
    if (term) return term;
  }
  return null;
}

// 言葉のすぐ下に出し、下に入らなければ上に出す
function popoverFor(term: string, anchor: HTMLElement): Popover | null {
  const entry = entries.find((item) => item.term === term);
  if (!entry) return null;
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - popoverWidth / 2),
    window.innerWidth - popoverWidth - margin,
  );
  const below = rect.bottom + 120 < window.innerHeight;
  return {
    ...entry,
    left,
    top: below ? rect.bottom + 8 : rect.top - 8,
    placement: below ? "below" : "above",
  };
}

// visible が false のあいだは虫眼鏡を出さない。
export function DictionaryProvider({ children, visible = true }: { children: ReactNode; visible?: boolean }) {
  const [popover, setPopover] = useState<Popover | null>(null);
  const [hint, setHint] = useState(false);
  const lensRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const restRef = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const draggedRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);

  function moveLens(x: number, y: number) {
    const lens = lensRef.current;
    if (!lens) return;
    const maxX = Math.max(margin, window.innerWidth - lensSize - margin);
    const maxY = Math.max(margin, window.innerHeight - lensSize - margin);
    const clamp = (value: number, max: number) => Math.min(max, Math.max(margin, value));
    let next = { x: clamp(x, maxX), y: clamp(y, maxY) };
    // 置いたまま意見追加ボタンに重ならないよう、近い空き位置へずらす
    const addButton = document.querySelector(".add-opinion")?.getBoundingClientRect();
    if (addButton && !dragRef.current) {
      const overlaps = (point: { x: number; y: number }) => point.x < addButton.right + margin && point.x + lensSize > addButton.left - margin && point.y < addButton.bottom + margin && point.y + lensSize > addButton.top - margin;
      if (overlaps(next)) {
        const candidates = [
          { x: next.x, y: addButton.top - lensSize - margin },
          { x: addButton.left - lensSize - margin, y: next.y },
        ].map((point) => ({ x: clamp(point.x, maxX), y: clamp(point.y, maxY) }))
          .filter((point) => !overlaps(point));
        if (candidates[0]) next = candidates[0];
      }
    }
    positionRef.current = next;
    lens.style.left = `${next.x}px`;
    lens.style.top = `${next.y}px`;
    lens.style.right = "auto";
    lens.style.bottom = "auto";
  }

  // 画面遷移や画面サイズの変更のあとも、虫眼鏡が画面内に収まるようにする
  useLayoutEffect(() => {
    function fitLens() {
      const rect = lensRef.current?.getBoundingClientRect();
      if (rect) moveLens(positionRef.current?.x ?? rect.left, positionRef.current?.y ?? rect.top);
    }
    fitLens();
    window.addEventListener("resize", fitLens);
    return () => window.removeEventListener("resize", fitLens);
  });

  // 吹き出しは Esc・外側のクリック・スクロールで閉じる
  useEffect(() => {
    if (!popover) return;
    const close = () => setPopover(null);
    const closeOnKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const closeOnOutside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !lensRef.current?.contains(target)) close();
    };
    window.addEventListener("keydown", closeOnKey);
    window.addEventListener("pointerdown", closeOnOutside);
    window.addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      window.removeEventListener("keydown", closeOnKey);
      window.removeEventListener("pointerdown", closeOnOutside);
      window.removeEventListener("scroll", close, { capture: true });
    };
  }, [popover]);

  // 押しただけでは何も起きないと分かりにくいため、使い方を少しだけ表示する
  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(false), 2400);
    return () => window.clearTimeout(timer);
  }, [hint]);

  function setTarget(next: HTMLElement | null) {
    if (targetRef.current === next) return;
    targetRef.current?.classList.remove("is-targeted");
    next?.classList.add("is-targeted");
    targetRef.current = next;
  }

  function openTerm(term: string, anchor: HTMLElement) {
    setHint(false);
    setPopover(popoverFor(term, anchor));
  }

  // 虫眼鏡を言葉に重ねて離したら解説を出し、元の位置へ戻す
  function dropOnTerm(returnLens: boolean) {
    const target = targetRef.current;
    setTarget(null);
    if (!target?.dataset.term) return false;
    openTerm(target.dataset.term, target);
    if (returnLens && restRef.current) moveLens(restRef.current.x, restRef.current.y);
    return true;
  }

  function checkLensTarget() {
    const rect = lensRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = lensPoint(rect);
    setTarget(termAt(point.x, point.y));
  }

  return <DictionaryContext.Provider value={openTerm}>
    {children}
    {visible && <button
      ref={lensRef}
      type="button"
      className="dictionary-lens"
      aria-label="虫眼鏡。言葉に重ねると解説を表示（ドラッグまたは矢印キーで移動、Enter で重なった言葉を調べる）"
      onClick={(event) => {
        // ドラッグの終わりの click は無視する。キーボードの Enter は event.detail が 0
        if (draggedRef.current && event.detail !== 0) return;
        checkLensTarget();
        // クリックやキーボードでは虫眼鏡を動かしていないので、元の位置へは戻さない
        if (!dropOnTerm(false)) setHint(true);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        const rect = lensRef.current?.getBoundingClientRect();
        if (!rect) return;
        draggedRef.current = false;
        restRef.current = positionRef.current;
        setPopover(null);
        setHint(false);
        dragRef.current = { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX, startY: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag?.pointerId !== event.pointerId) return;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) draggedRef.current = true;
        if (!draggedRef.current) return;
        lensRef.current?.classList.add("is-dragging");
        moveLens(event.clientX - drag.x, event.clientY - drag.y);
        checkLensTarget();
      }}
      onPointerUp={(event) => {
        const wasDragged = draggedRef.current;
        dragRef.current = null;
        lensRef.current?.classList.remove("is-dragging");
        event.currentTarget.releasePointerCapture(event.pointerId);
        if (wasDragged && !dropOnTerm(true)) {
          // 言葉の外で離したら、その場所に置いたままにする
          const position = positionRef.current;
          if (position) moveLens(position.x, position.y);
        }
      }}
      onLostPointerCapture={() => { dragRef.current = null; lensRef.current?.classList.remove("is-dragging"); }}
      onPointerCancel={() => { dragRef.current = null; setTarget(null); lensRef.current?.classList.remove("is-dragging"); }}
      onKeyDown={(event) => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const direction = directions[event.key];
        const position = positionRef.current;
        if (!direction || !position) return;
        event.preventDefault();
        draggedRef.current = false;
        const step = event.shiftKey ? 40 : 10;
        moveLens(position.x + direction[0] * step, position.y + direction[1] * step);
        checkLensTarget();
      }}
    >
      <svg width={lensSize} height={lensSize} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M30 30 L42 42" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="14" fill="#fff" stroke="var(--ink)" strokeWidth="3.5" />
        <text x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill="var(--ink)">?</text>
      </svg>
    </button>}
    {visible && hint && <p className="dictionary-hint" role="status">青い言葉に重ねると解説が出ます</p>}
    {popover && <div
      ref={popoverRef}
      className={`dictionary-popover ${popover.placement}`}
      role="dialog"
      aria-label={`${popover.term}の解説`}
      style={{ top: popover.top, left: popover.left, width: popoverWidth }}
    >
      <button type="button" className="dictionary-popover-close" aria-label="解説を閉じる" onClick={() => setPopover(null)}>×</button>
      <h2>{popover.term}</h2>
      <p>{popover.definition}</p>
    </div>}
  </DictionaryContext.Provider>;
}

export function DictionaryText({ children, interactive = true }: { children: string; interactive?: boolean }) {
  const openTerm = useContext(DictionaryContext);
  // Prefer longer terms when dictionary entries overlap.
  const terms = entries.map(entry => entry.term).sort((a, b) => b.length - a.length);
  const parts: ReactNode[] = [];
  let remaining = children;
  while (remaining) {
    const matches = terms.map(term => ({ term, index: remaining.indexOf(term) })).filter(match => match.index >= 0).sort((a, b) => a.index - b.index);
    const match = matches[0];
    if (!match) { parts.push(remaining); break; }
    parts.push(remaining.slice(0, match.index));
    parts.push(interactive
      ? <button type="button" className="dictionary-term" data-term={match.term} key={parts.length} aria-label={`${match.term}の意味を表示`} onClick={(event) => openTerm(match.term, event.currentTarget)}>{match.term}</button>
      : <span className="dictionary-term" data-term={match.term} key={parts.length}>{match.term}</span>);
    remaining = remaining.slice(match.index + match.term.length);
  }
  return <>{parts}</>;
}
