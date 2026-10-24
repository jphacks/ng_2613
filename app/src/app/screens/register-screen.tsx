import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";

type Props = Pick<DiscussionState, "profile" | "submitAccount" | "otpSent" | "accountSubmitting" | "accountError">;

export default function RegisterScreen({ profile, submitAccount, otpSent, accountSubmitting, accountError }: Props) {
  return (
    <section className="account-screen">
      <form onSubmit={submitAccount}>
        <AccountFields mode="register" profile={profile} otpSent={otpSent} />
        {accountError && <p className="account-error" role="alert">{accountError}</p>}
        <div className="account-actions">
          <button className="primary" type="submit" disabled={accountSubmitting}>
            {accountSubmitting ? "処理中…" : otpSent ? "コードを確認" : "認証メールを送信"}
          </button>
        </div>
      </form>
    </section>
  );
}
