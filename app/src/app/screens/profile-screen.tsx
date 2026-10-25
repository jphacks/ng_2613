import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./profile-screen.css";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount" | "accountSubmitting" | "accountError">;

export default function ProfileScreen({ profile, navigate, submitAccount, accountSubmitting, accountError }: Props) {
  return (
    <section className="account-screen">
      <form key={`${profile.username}-${profile.gender}-${profile.birthDate}`} onSubmit={submitAccount}>
        <AccountFields mode="profile" profile={profile} />
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? "処理中…" : "変更"}
          </button>
          {profile.complete && (
            <button type="button" className="secondary" onClick={() => navigate("home")}>キャンセル</button>
          )}
        </div>
      </form>
    </section>
  );
}
