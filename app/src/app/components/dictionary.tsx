"use client";

import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import bookSearchIcon from "../images/book-search.svg";
import "./dictionary.css";

const entries = [
  { term: "消費税", definition: "商品を買うとかかるお金です" },
];
const DictionaryContext = createContext<(term: string) => void>(() => {});

export function DictionaryProvider({ children }: { children: ReactNode }) {
  const [minimized, setMinimized] = useState(true);
  const [selectedTerm, setSelectedTerm] = useState(entries[0].term);
  const contentRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const positionRef = useRef<{ x: number; y: number } | null>(null);
  const draggedRef = useRef(false);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; startX: number; startY: number } | null>(null);

  function movePanel(x: number, y: number) {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    const clamp = (value: number, max: number) => Math.min(max, Math.max(margin, value));
    let next = { x: clamp(x, maxX), y: clamp(y, maxY) };
    const addButton = document.querySelector(".add-opinion")?.getBoundingClientRect();
    if (addButton) {
      const overlaps = (point: { x: number; y: number }) => point.x < addButton.right + margin && point.x + width > addButton.left - margin && point.y < addButton.bottom + margin && point.y + height > addButton.top - margin;
      if (overlaps(next)) {
        const candidates = [
          { x: next.x, y: addButton.top - height - margin },
          { x: addButton.left - width - margin, y: next.y },
          { x: addButton.right + margin, y: next.y },
          { x: next.x, y: addButton.bottom + margin },
        ].map(point => ({ x: clamp(point.x, maxX), y: clamp(point.y, maxY) }))
          .filter(point => !overlaps(point))
          .sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y));
        if (candidates[0]) next = candidates[0];
      }
    }
    positionRef.current = next;
    panel.style.left = `${next.x}px`;
    panel.style.top = `${next.y}px`;
    panel.style.right = "auto";
    panel.style.bottom = "auto";
  }

  // Recheck after navigation, minimizing, and reopening so the panel stays usable.
  useLayoutEffect(() => {
    function fitPanel() {
      const rect = panelRef.current?.getBoundingClientRect();
      if (rect) movePanel(positionRef.current?.x ?? rect.left, positionRef.current?.y ?? rect.top);
    }
    fitPanel();
    const observer = new ResizeObserver(fitPanel);
    if (panelRef.current) observer.observe(panelRef.current);
    window.addEventListener("resize", fitPanel);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", fitPanel);
    };
  });
  function openTerm(term: string) {
    setSelectedTerm(term);
    setMinimized(false);
    contentRef.current?.scrollTo({ top: 0 });
  }
  const selected = entries.find(entry => entry.term === selectedTerm) ?? entries[0];
  return <DictionaryContext.Provider value={openTerm}>
    {children}
    <aside ref={panelRef} className={`dictionary-panel${minimized ? " minimized" : ""}`} aria-label="辞書">
      <div className="dictionary-header">
        <button type="button" className="dictionary-drag-handle" aria-label={minimized ? "辞書を開く（ドラッグまたは矢印キーで移動）" : "辞書を移動（ドラッグまたは矢印キー）"}
          aria-expanded={minimized ? false : undefined} aria-controls={minimized ? "dictionary-content" : undefined}
          onClick={event => { if (minimized && (!draggedRef.current || event.detail === 0)) setMinimized(false); }}
          onPointerDown={event => {
            if (event.button !== 0) return;
            const rect = panelRef.current?.getBoundingClientRect();
            if (!rect) return;
            draggedRef.current = false;
            dragRef.current = { pointerId: event.pointerId, x: event.clientX - rect.left, y: event.clientY - rect.top, startX: event.clientX, startY: event.clientY };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={event => {
            const drag = dragRef.current;
            if (drag?.pointerId === event.pointerId) {
              if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 4) draggedRef.current = true;
              movePanel(event.clientX - drag.x, event.clientY - drag.y);
            }
          }}
          onPointerUp={event => {
            dragRef.current = null;
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onLostPointerCapture={() => { dragRef.current = null; }}
          onPointerCancel={() => { dragRef.current = null; }}
          onKeyDown={event => {
            const directions: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
            const direction = directions[event.key];
            const position = positionRef.current;
            if (!direction || !position) return;
            event.preventDefault();
            const step = event.shiftKey ? 40 : 10;
            movePanel(position.x + direction[0] * step, position.y + direction[1] * step);
          }}>{minimized ? <Image src={bookSearchIcon} width={28} height={28} alt="" draggable={false} /> : <span aria-hidden="true">⠿</span>}</button>
        {!minimized && <button type="button" aria-label="辞書を最小化" aria-expanded={true} aria-controls="dictionary-content" onClick={() => setMinimized(true)}>−</button>}
      </div>
      <div ref={contentRef} id="dictionary-content" className="dictionary-content" hidden={minimized} tabIndex={0} role="region" aria-label="用語の説明">
        <h2>{selected.term}</h2>
        <p>{selected.definition}</p>
      </div>
    </aside>
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
      ? <button type="button" className="dictionary-term" key={parts.length} aria-label={`${match.term}の意味を辞書で表示`} onClick={() => openTerm(match.term)}>{match.term}</button>
      : <span className="dictionary-term" key={parts.length}>{match.term}</span>);
    remaining = remaining.slice(match.index + match.term.length);
  }
  return <>{parts}</>;
}
