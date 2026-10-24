import type { DataStatus } from "../hooks/use-discussion-state";
import "./data-state.css";

type Props = {
  status: DataStatus;
  error?: string;
  emptyMessage: string;
  onRetry?: () => void;
  onLogin?: () => void;
};

export default function DataState({ status, error, emptyMessage, onRetry, onLogin }: Props) {
  if (status === "loading" || status === "idle") {
    return <p className="data-state" role="status">読み込み中…</p>;
  }
  if (status === "unauthenticated") {
    return <div className="data-state">
      <p>この情報を表示するにはログインが必要です。</p>
      <button className="secondary" onClick={onLogin}>ログインへ</button>
    </div>;
  }
  if (status === "error") {
    return <div className="data-state" role="alert">
      <p>{error || "データを取得できませんでした。"}</p>
      <button className="secondary" onClick={onRetry}>再試行</button>
    </div>;
  }
  if (status === "empty") {
    return <p className="data-state">{emptyMessage}</p>;
  }
  return null;
}
