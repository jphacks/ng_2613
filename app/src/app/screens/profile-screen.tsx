import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./profile-screen.css";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount" | "accountSubmitting" | "accountError">;

export default function ProfileScreen({ profile, navigate, submitAccount, accountSubmitting, accountError }: Props) {
  return (
    <section className="account-screen">
      <form key={`${profile.phone}-${profile.gender}-${profile.year}`} onSubmit={submitAccount}>
        <AccountFields mode="profile" profile={profile} />
        <p className="account-help">電話番号の変更には、別途SMS認証が必要です。</p>
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? "処理中…" : "変更"}
          </button>
          <button type="button" className="secondary" onClick={() => navigate("home")}>キャンセル</button>
        </div>
      </form>
    </section>
  );
}
