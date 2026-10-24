import type { DiscussionState } from "../hooks/use-discussion-state";
import "./account-form.css";

type Props = Pick<DiscussionState, "profile"> & {
  mode: "login" | "register" | "profile";
  otpSent?: boolean;
};

// 入力欄のみ共用し、フォーム送信・レイアウト・ボタンは各画面で管理する。
export default function AccountFields({ mode, profile, otpSent = false }: Props) {
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
          placeholder={isLogin ? "+819012345678" : ""}
          defaultValue={profile.phone}
          required
          readOnly={isProfile || otpSent}
          pattern="\+[0-9０-９\- ()]{8,18}"
        />
      </label>
      {otpSent && !isProfile && (
        <label className="account-field">
          <span>認証コード</span>
          <input
            name="token"
            aria-label="SMS認証コード"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9０-９]{6}"
            maxLength={6}
            placeholder="6桁のコード"
            required
          />
        </label>
      )}
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
              {Array.from({ length: new Date().getFullYear() - 1899 }, (_, index) => new Date().getFullYear() - index).map((year) => (
                <option value={year} key={year}>{year}年</option>
              ))}
            </select>
          </label>
        </>
      )}
    </>
  );
}
