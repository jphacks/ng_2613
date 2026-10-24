import type { DataStatus } from "../hooks/use-discussion-state";
import "./data-state.css";

type Skeleton = "tiles" | "rows" | "cards" | "messages";

type Props = {
  status: DataStatus;
  error?: string;
  emptyMessage: string;
  onRetry?: () => void;
  onLogin?: () => void;
  skeleton?: Skeleton;
};

// 読み込み中は、表示される画面と同じ形の仮表示を出して、画面の跳ねを抑える。
function LoadingSkeleton({ type }: { type: Skeleton }) {
  if (type === "tiles") {
    return <div className="topic-grid" aria-hidden="true">
      {[0, 1, 2, 3].map((index) => <div className="topic-tile" key={index}>
        <span className="skeleton skeleton-circle" />
        <span className="skeleton skeleton-text" />
      </div>)}
    </div>;
  }
  if (type === "cards") {
    return <div className="summaries" aria-hidden="true">
      {[0, 1].map((index) => <span className="skeleton skeleton-card" key={index} />)}
    </div>;
  }
  if (type === "messages") {
    return <div className="skeleton-messages" aria-hidden="true">
      <span className="skeleton skeleton-title" />
      {[0, 1, 2].map((index) => <span className="skeleton skeleton-bubble" key={index} />)}
    </div>;
  }
  return <div className="middle-topics" aria-hidden="true">
    <span className="skeleton skeleton-circle skeleton-hero" />
    {[0, 1, 2, 3].map((index) => <span className="skeleton skeleton-row" key={index} />)}
  </div>;
}

export default function DataState({ status, error, emptyMessage, onRetry, onLogin, skeleton = "rows" }: Props) {
  if (status === "loading" || status === "idle") {
    return <div role="status">
      <span className="visually-hidden">読み込み中…</span>
      <LoadingSkeleton type={skeleton} />
    </div>;
  }
  if (status === "unauthenticated") {
    return <div className="data-state">
      <span className="data-state-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
      </span>
      <p>この情報を表示するにはログインが必要です。</p>
      <button className="secondary" onClick={onLogin}>ログインへ</button>
    </div>;
  }
  if (status === "error") {
    return <div className="data-state" role="alert">
      <span className="data-state-icon" aria-hidden="true">!</span>
      <p>{error || "データを取得できませんでした。"}</p>
      <button className="secondary" onClick={onRetry}>再試行</button>
    </div>;
  }
  if (status === "empty") {
    return <div className="data-state data-state-empty">
      <span className="data-state-icon" aria-hidden="true">…</span>
      <p>{emptyMessage}</p>
    </div>;
  }
  return null;
}
