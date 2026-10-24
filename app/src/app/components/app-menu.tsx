import type { DiscussionState } from "../hooks/use-discussion-state";
import "./app-menu.css";
type Props = Pick<DiscussionState, "navigate" | "setMenuOpen">;
export default function AppMenu({ navigate, setMenuOpen }: Props) {
    return (<>
    <button className="menu-scrim" aria-label="メニューを閉じる" onClick={() => setMenuOpen(false)}/>
    <nav className="drawer" aria-label="メニュー">
    <button onClick={() => navigate("profile")}>会員情報変更</button>
    <button onClick={() => navigate("login")}>ログイン</button>
    <button onClick={() => navigate("register")}>新規登録</button>
    <button onClick={() => navigate("video")}>動画・投票</button>
    <button onClick={() => navigate("home")}>ホームへ</button>
    </nav>
    </>);
}
