import AccountFields from "../components/account-fields";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./profile-screen.css";

type Props = Pick<DiscussionState, "profile" | "navigate" | "submitAccount">;

export default function ProfileScreen({ profile, navigate, submitAccount }: Props) {
  return (
    <section className="account-screen">
      <form onSubmit={submitAccount}>
        <AccountFields mode="profile" profile={profile} />
        <div className="account-actions">
          <button className="primary" type="submit">変更</button>
          <button type="button" className="secondary" onClick={() => navigate("home")}>キャンセル</button>
        </div>
      </form>
    </section>
  );
}
