import { useEffect, useId } from "react";
import { exploreChatSummary, mockExploreBranches } from "../lib/explore/mock";
import type { CatalogGenre } from "../lib/catalog/types";
import "./explore-map.css";

type Props = {
  genres: CatalogGenre[];
  onTopic: (topicId: string) => void;
  onClose: () => void;
};

export function TelescopeIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M3.5 13.8 14.8 8.6l1.9 4-11.3 5.2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m14.8 8.6 3.4-1.6 1.9 4-3.4 1.6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m10.8 15.6-2.8 5.9M11.6 15.2l3 6.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

// 線の形。横は幅に合わせて伸び縮みする 0〜100、縦は px（.explore-map の高さ 560px と札の位置に合わせる）
const linePaths = [
  // AI チャットから2つの枝へ
  "M50 88 C50 124 27 124 27 160",
  "M50 88 C50 124 73 124 73 160",
  // 枝から、すぐ下の問いへ
  "M27 200 L28 260",
  "M73 200 L72 260",
  // 枝から、外側を回って2つ目の問いへ
  "M27 200 C27 232 4 232 4 272 L4 440 C4 458 6 465 8 465",
  "M73 200 C73 232 96 232 96 272 L96 440 C96 458 94 465 92 465",
];

// 自分の AI チャットから線が伸びて分かれ、その先におすすめの問いが出る（今はモック）
export default function ExploreMap({ genres, onTopic, onClose }: Props) {
  const titleId = useId();
  const gradientId = useId();
  const branches = mockExploreBranches(genres);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  return (
    <section className="explore" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="explore-header">
        <span className="explore-header-icon"><TelescopeIcon /></span>
        <h2 id={titleId}>探索する</h2>
        <button type="button" className="explore-close" aria-label="閉じる" onClick={onClose}>×</button>
      </header>
      <div className="explore-map">
        <svg className="explore-lines" viewBox="0 0 100 560" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1="88" x2="0" y2="470">
              <stop offset="0" stopColor="#5a9a3c" />
              <stop offset=".55" stopColor="#49a3d3" />
              <stop offset="1" stopColor="#9b7fd1" />
            </linearGradient>
          </defs>
          {linePaths.map((path, index) => (
            <path key={path} d={path} pathLength={1} className={`explore-line level-${index < 2 ? 1 : 2}`} stroke={`url(#${gradientId})`} />
          ))}
        </svg>
        <div className="explore-node explore-root">
          <span className="explore-root-label">あなたのAIチャット</span>
          <p>「{exploreChatSummary}」</p>
        </div>
        {branches.map((branch, branchIndex) => (
          <div key={branch.label}>
            <span className={`explore-node explore-branch side-${branchIndex}`}>{branch.label}</span>
            {branch.topics.map((topic, topicIndex) => (
              <button key={topic.id} type="button" className={`explore-node explore-leaf side-${branchIndex} row-${topicIndex}`} onClick={() => onTopic(topic.id)}>
                <span className="explore-leaf-label">この問いがおすすめです</span>
                <span className="explore-leaf-name">{topic.name}</span>
              </button>
            ))}
          </div>
        ))}
      </div>
      <p className="explore-note">今はモックです。AIチャットの中身は見ず、決まった枝を出しています。</p>
    </section>
  );
}
