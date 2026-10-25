"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import glossary from "../../../../supabase/seed/glossary.json";
import "./dictionary.css";

const entries = glossary.map(({ term, description }) => ({ term, definition: description }));
// 重なる用語は長いものを優先する。
const terms = entries.map(({ term }) => term).sort((a, b) => b.length - a.length);

type Popover = { term: string; definition: string; top: number; left: number; placement: "below" | "above" };

const lensSize = 48;
// レンズの丸の中心（SVG の circle の cx, cy）
const lensCenter = 20;
// 指で動かすとき、レンズの丸を指からどれだけ上に出すか
const touchLift = 50;
// 虫眼鏡の下に出す一言の高さ。画面からはみ出さないよう位置の計算に含める
const captionHeight = 30;
// 一言は虫眼鏡より横に広く、左右に少しはみ出す。その分も画面内に収める
const captionOverhang = 18;
const margin = 8;
// 解説の吹き出しの幅。画面の端からはみ出さないよう位置の計算にも使う
const popoverWidth = 220;
// 使い方の一言を見せ終えたことを覚えておくキー
const captionSeenKey = "dictionary-lens-caption-seen";

function hasSeenCaption() {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(captionSeenKey) === "1";
  } catch {
    return false;
  }
}

// 虫眼鏡のレンズの中心（下の SVG の円の中心 20,20 / 48）。ここが重なった言葉を調べる
function lensPoint(rect: DOMRect) {
  return { x: rect.left + rect.width * (20 / 48), y: rect.top + rect.height * (20 / 48) };
}

// レンズの円（SVG の半径 14 / 48）に、少しでもかかったら反応するよう外側に余裕を持たせる
const lensReachPadding = 4;

// 言葉は押せない（クリックを下の行に通す）ため、要素の当たり判定ではなく表示位置で調べる。
// レンズの円と言葉の矩形が少しでも重なれば反応し、複数あればレンズの中心に一番近い言葉を選ぶ。
// 折り返した言葉にも対応するよう、行ごとの矩形を見る。
function termAt(x: number, y: number, radius: number) {
  let nearest: { element: HTMLElement; distance: number } | null = null;
  for (const element of document.querySelectorAll<HTMLElement>(".dictionary-term[data-term]")) {
    for (const rect of element.getClientRects()) {
      // 矩形の中でレンズの中心に一番近い点までの距離
      const dx = x - Math.min(Math.max(x, rect.left), rect.right);
      const dy = y - Math.min(Math.max(y, rect.top), rect.bottom);
      const distance = Math.hypot(dx, dy);
      if (distance <= radius && (!nearest || distance < nearest.distance)) nearest = { element, distance };
    }
  }
  return nearest?.element ?? null;
}

// 虫眼鏡は言葉の下側にかぶさるので、解説は言葉の上に出す。上に入らなければ虫眼鏡の下に出す。
function popoverFor(term: string, anchor: HTMLElement): Popover | null {
  const entry = entries.find((item) => item.term === term);
  if (!entry) return null;
  const rect = anchor.getBoundingClientRect();
  const left = Math.min(
    Math.max(margin, rect.left + rect.width / 2 - popoverWidth / 2),
    window.innerWidth - popoverWidth - margin,
  );
  const above = rect.top - 110 > 0;
  return {
    ...entry,
    left,
    top: above ? rect.top - 8 : rect.bottom + lensSize + captionHeight,
    placement: above ? "above" : "below",
  };
}

function samePopover(a: Popover | null, b: Popover | null) {
  return a?.term === b?.term && a?.top === b?.top && a?.left === b?.left && a?.placement === b?.placement;
}

// visible が false のあいだは虫眼鏡を出さない。
export function DictionaryProvider({ children, visible = true }: { children: ReactNode; visible?: boolean }) {
  const [popover, setPopover] = useState<Popover | null>(null);
  // 使い方の一言は最初だけ出し、初めて虫眼鏡に触れたら消す。一度消したら次回以降も出さない
  const [captionVisible, setCaptionVisible] = useState(() => !hasSeenCaption());
  const lensRef = useRef<HTMLButtonElement>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number } | null>(null);

  function moveLens(x: number, y: number) {
    const lens = lensRef.current;
    if (!lens) return;
    const minX = margin + captionOverhang;
    const maxX = Math.max(minX, window.innerWidth - lensSize - margin - captionOverhang);
    const maxY = Math.max(margin, window.innerHeight - lensSize - captionHeight - margin);
    const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
    let next = { x: clamp(x, minX, maxX), y: clamp(y, margin, maxY) };
    // 置いたまま意見追加ボタンに重ならないよう、近い空き位置へずらす
    const addButton = document.querySelector(".add-opinion")?.getBoundingClientRect();
    if (addButton && !dragRef.current) {
      const overlaps = (point: { x: number; y: number }) => point.x < addButton.right + margin && point.x + lensSize > addButton.left - margin && point.y < addButton.bottom + margin && point.y + lensSize > addButton.top - margin;
      if (overlaps(next)) {
        const candidates = [
          { x: next.x, y: addButton.top - lensSize - margin },
          { x: addButton.left - lensSize - margin, y: next.y },
        ]
          .map((point) => ({ x: clamp(point.x, minX, maxX), y: clamp(point.y, margin, maxY) }))
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

  function dismissCaption() {
    if (!captionVisible) return;
    setCaptionVisible(false);
    try {
      window.localStorage.setItem(captionSeenKey, "1");
    } catch {
      // 保存できない環境では、ページを開くたびに最初だけ出る
    }
  }

  // レンズの下にある言葉を調べ、重なっているあいだだけ解説を出す
  function updateTarget() {
    const rect = lensRef.current?.getBoundingClientRect();
    const point = rect ? lensPoint(rect) : null;
    const next = point && rect ? termAt(point.x, point.y, rect.width * (14 / 48) + lensReachPadding) : null;
    if (targetRef.current !== next) {
      targetRef.current?.classList.remove("is-targeted");
      next?.classList.add("is-targeted");
      targetRef.current = next;
      // 言葉に重なっているあいだは「?」を消して、レンズ越しに言葉が見えるようにする
      lensRef.current?.classList.toggle("is-over-term", Boolean(next));
    }
    const nextPopover = next?.dataset.term ? popoverFor(next.dataset.term, next) : null;
    // 同じ内容なら state を更新しない（描画のたびに呼ぶため、無限に再描画しないように）
    setPopover((current) => samePopover(current, nextPopover) ? current : nextPopover);
  }

  // 画面遷移や画面サイズの変更のあとも、虫眼鏡を画面内に収め、下の言葉を調べ直す
  useLayoutEffect(() => {
    const rect = lensRef.current?.getBoundingClientRect();
    if (rect) moveLens(positionRef.current?.x ?? rect.left, positionRef.current?.y ?? rect.top);
    updateTarget();
  });

  // 置いたままの虫眼鏡の下を画面がスクロールしたり、画面サイズが変わったりしたときも調べ直す
  useEffect(() => {
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = lensRef.current?.getBoundingClientRect();
        if (rect) moveLens(positionRef.current?.x ?? rect.left, positionRef.current?.y ?? rect.top);
        updateTarget();
      });
    };
    window.addEventListener("scroll", schedule, { passive: true, capture: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  });

  return <>
    {children}
    {visible && <button
      ref={lensRef}
      type="button"
      className="dictionary-lens"
      aria-label="虫眼鏡。言葉に重ねているあいだ解説を表示（ドラッグまたは矢印キーで移動）"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        dismissCaption();
        const rect = lensRef.current?.getBoundingClientRect();
        if (!rect) return;
        // 指で動かすと虫眼鏡と下の言葉が指で隠れるため、タッチのときはレンズの丸の中心を指の少し上に出す
        const touch = event.pointerType === "touch";
        dragRef.current = touch
          ? { pointerId: event.pointerId, x: lensCenter, y: lensCenter + touchLift }
          : { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top };
        lensRef.current?.classList.add("is-dragging");
        event.currentTarget.setPointerCapture(event.pointerId);
        if (touch) {
          moveLens(event.clientX - dragRef.current.x, event.clientY - dragRef.current.y);
          updateTarget();
        }
      }}
      onPointerMove={(event) => {
        const drag = dragRef.current;
        if (drag?.pointerId !== event.pointerId) return;
        moveLens(event.clientX - drag.x, event.clientY - drag.y);
        updateTarget();
      }}
      onPointerUp={(event) => {
        dragRef.current = null;
        lensRef.current?.classList.remove("is-dragging");
        event.currentTarget.releasePointerCapture(event.pointerId);
        // 離した場所に置いたままにする（意見追加ボタンとの重なりだけは避ける）
        const position = positionRef.current;
        if (position) moveLens(position.x, position.y);
        updateTarget();
      }}
      onLostPointerCapture={() => { dragRef.current = null; lensRef.current?.classList.remove("is-dragging"); }}
      onPointerCancel={() => { dragRef.current = null; lensRef.current?.classList.remove("is-dragging"); }}
      onKeyDown={(event) => {
        const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
        const direction = directions[event.key];
        const position = positionRef.current;
        if (!direction || !position) return;
        event.preventDefault();
        dismissCaption();
        const step = event.shiftKey ? 40 : 10;
        moveLens(position.x + direction[0] * step, position.y + direction[1] * step);
        updateTarget();
      }}
    >
      <svg width={lensSize} height={lensSize} viewBox="0 0 48 48" aria-hidden="true">
        <path d="M30 30 L42 42" stroke="var(--ink)" strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="20" r="14" fill="#bfe6ff73" stroke="var(--ink)" strokeWidth="3.5" />
        <text className="dictionary-lens-mark" x="20" y="20" textAnchor="middle" dominantBaseline="central" fontSize="17" fontWeight="700" fill="var(--ink)">?</text>
      </svg>
      <span className={`dictionary-lens-caption${captionVisible ? "" : " is-dismissed"}`} aria-hidden="true">わからない言葉に<br />移動させよう</span>
    </button>}
    {visible && popover && <div
      className={`dictionary-popover ${popover.placement}`}
      role="status"
      aria-label={`${popover.term}の解説`}
      style={{ top: popover.top, left: popover.left, width: popoverWidth }}
    >
      <h2>{popover.term}</h2>
      <p>{popover.definition}</p>
    </div>}
  </>;
}

// 辞書にある言葉に印を付ける。押せる要素にはせず、クリックは下の行などにそのまま通す。
export function DictionaryText({ children }: { children: string }) {
  const parts: ReactNode[] = [];
  let remaining = children;
  while (remaining) {
    const matches = terms.map(term => ({ term, index: remaining.indexOf(term) })).filter(match => match.index >= 0).sort((a, b) => a.index - b.index);
    const match = matches[0];
    if (!match) { parts.push(remaining); break; }
    parts.push(remaining.slice(0, match.index));
    parts.push(<span className="dictionary-term" data-term={match.term} key={parts.length}>{match.term}</span>);
    remaining = remaining.slice(match.index + match.term.length);
  }
  return <>{parts}</>;
}
