import type { DiscussionState } from "../hooks/use-discussion-state";
import "./account-form.css";

type Props = Pick<DiscussionState, "profile"> & {
  mode: "login" | "register" | "profile";
};

// 入力欄のみ共用し、フォーム送信・レイアウト・ボタンは各画面で管理する。
export default function AccountFields({ mode, profile }: Props) {
  const isLogin = mode === "login";
  const isProfile = mode === "profile";

  if (!isLogin) {
    return (
      <>
        <label className="account-field">
          <span>ユーザー名（必須）</span>
          <input name="username" aria-label="ユーザー名" autoComplete="nickname" defaultValue={isProfile ? profile.username : ""} required pattern=".*\S.*" />
        </label>
        <fieldset className="gender-field">
          <legend>性別（任意）</legend>
          {["男性", "女性", "その他", "回答しない"].map((label) => (
            <label key={label}>
              <input type="radio" name="gender" value={label === "回答しない" ? "" : label} defaultChecked={isProfile && profile.gender === (label === "回答しない" ? "" : label)} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="account-field">
          <span>生年月日（任意）</span>
          <input name="birthDate" aria-label="生年月日" type="date" autoComplete="bday" defaultValue={isProfile ? profile.birthDate : ""} />
        </label>
      </>
    );
  }

  return (
    <>
      <label className="account-field">
        {!isLogin && <span>電話番号</span>}
        <input
          name="phone"
          aria-label="電話番号"
          type="tel"
          autoComplete="tel"
          placeholder="電話番号"
          defaultValue={isProfile ? profile.phone : ""}
          required
          pattern="[0-9０-９+\- ()]{10,15}"
        />
      </label>
      <label className="account-field">
        {!isLogin && <span>パスワード</span>}
        <input
          name="password"
          aria-label="パスワード"
          type="password"
          autoComplete="current-password"
          placeholder="パスワード"
          required
          minLength={8}
        />
      </label>
    </>
  );
}
