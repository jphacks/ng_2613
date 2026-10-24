import type { DiscussionState } from "../hooks/use-discussion-state";
import "./account-form.css";

type Props = Pick<DiscussionState, "profile"> & {
  mode: "login" | "register" | "profile";
};

// 入力欄のみ共用し、フォーム送信・レイアウト・ボタンは各画面で管理する。
export default function AccountFields({ mode, profile }: Props) {
  const isLogin = mode === "login";
  const isProfile = mode === "profile";

  return (
    <>
      <label className="account-field">
        {!isLogin && <span>電話番号</span>}
        <input
          name="phone"
          aria-label="電話番号"
          type="tel"
          autoComplete="tel"
          placeholder={isLogin ? "電話番号" : ""}
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
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          placeholder={isLogin ? "パスワード" : ""}
          required={!isProfile}
          minLength={8}
        />
      </label>
      {!isLogin && (
        <>
          <fieldset className="gender-field">
            <legend>性別</legend>
            {["男性", "女性", "その他"].map((label) => (
              <label key={label}>
                <input
                  type="radio"
                  name="gender"
                  value={label}
                  defaultChecked={isProfile && profile.gender === label}
                  required
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="year-field">
            <span>生まれた年</span>
            <select
              aria-label="生まれた年"
              name="year"
              defaultValue={isProfile ? profile.year : ""}
              required
            >
              <option value="" disabled />
              {Array.from({ length: 127 }, (_, index) => 2026 - index).map((year) => (
                <option value={year} key={year}>{year}年</option>
              ))}
            </select>
          </label>
        </>
      )}
    </>
  );
}
