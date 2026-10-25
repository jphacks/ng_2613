import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount" | "accountSubmitting" | "accountError">;

export default function RegisterScreen({ profile, navigate, submitAccount, accountSubmitting, accountError }: Props) {
  return (
    <section className="account-screen">
      <form onSubmit={submitAccount}>
        <AccountFields mode="register" profile={profile} />
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? "処理中…" : "新規登録"}
          </button>
        </div>
      </form>
      <div className="account-switch">
        <button onClick={() => navigate("login")}>ログインはこちら</button>
      </div>
    </section>
  );
}
