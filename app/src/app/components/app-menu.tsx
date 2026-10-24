import type { DiscussionState } from "../hooks/use-discussion-state";
import "./app-menu.css";

type Props = Pick<DiscussionState, "navigate" | "setMenuOpen" | "authStatus" | "signOut" | "accountSubmitting"> & {
  persistent?: boolean;
};

export default function AppMenu({
  navigate, setMenuOpen, authStatus, signOut, accountSubmitting, persistent = false,
}: Props) {
  return <>
    {!persistent && <button className="menu-scrim" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)} />}
    <nav className={persistent ? "desktop-menu" : "drawer"} aria-label="メニュー">
      {authStatus === "authenticated" ? <>
        <button onClick={() => navigate("profile")}>会員情報変更</button>
        <button disabled={accountSubmitting} onClick={() => void signOut()}>ログアウト</button>
      </> : <>
        <button onClick={() => navigate("login")}>ログイン</button>
        <button onClick={() => navigate("register")}>新規登録</button>
      </>}
      <button disabled>動画（準備中）</button>
      <button onClick={() => navigate("home")}>ホームへ</button>
    </nav>
  </>;
}
