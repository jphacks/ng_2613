import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./login-screen.css";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount" | "accountSubmitting" | "accountError">;

export default function LoginScreen({ profile, navigate, submitAccount, accountSubmitting, accountError }: Props) {
  return (
    <section className="account-screen login-screen">
      <div className="avatar-placeholder" />
      <h1>ログイン</h1>
      <form onSubmit={submitAccount}>
        <AccountFields mode="login" profile={profile} />
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? "処理中…" : "ログイン"}
          </button>
        </div>
      </form>
      <div className="account-switch">
        <button onClick={() => navigate("register")}>新規登録はこちら</button>
      </div>
    </section>
  );
}
