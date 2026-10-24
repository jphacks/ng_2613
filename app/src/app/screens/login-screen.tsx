import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./login-screen.css";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount" | "setNotice">;

export default function LoginScreen({ profile, navigate, submitAccount, setNotice }: Props) {
  return (
    <section className="account-screen login-screen">
      <div className="avatar-placeholder" />
      <h1>ログイン</h1>
      <form onSubmit={submitAccount}>
        <AccountFields mode="login" profile={profile} />
        <div className="account-actions">
          <button className="primary" type="submit">ログイン</button>
        </div>
      </form>
      <div className="login-links">
        <button onClick={() => navigate("register")}>新規登録はこちら</button>
        <button onClick={() => setNotice("パスワード再設定はデモでは利用できません。")}>パスワードを忘れた方</button>
      </div>
    </section>
  );
}
