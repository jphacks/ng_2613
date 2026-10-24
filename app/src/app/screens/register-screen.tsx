import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";

type Props = Pick<DiscussionState, "profile" | "submitAccount">;

export default function RegisterScreen({ profile, submitAccount }: Props) {
  return (
    <section className="account-screen">
      <form onSubmit={submitAccount}>
        <AccountFields mode="register" profile={profile} />
        <div className="account-actions">
          <button className="primary" type="submit">新規登録</button>
        </div>
      </form>
    </section>
  );
}
