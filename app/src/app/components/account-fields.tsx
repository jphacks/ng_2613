"use client";

import { useState } from "react";
import type { DiscussionState } from "../hooks/use-discussion-state";
import "./account-form.css";

type Props = Pick<DiscussionState, "profile"> & {
  mode: "login" | "register" | "profile";
};

// 入力欄のみ共用し、フォーム送信・レイアウト・ボタンは各画面で管理する。
export default function AccountFields({ mode, profile }: Props) {
  const isProfile = mode === "profile";
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);

  return <>
    <label className="account-field">
      <span>メールアドレス</span>
      <input
        name="email"
        aria-label="メールアドレス"
        type="email"
        autoComplete="email"
        placeholder="name@example.com"
        defaultValue={profile.email}
        required
        readOnly={isProfile}
        maxLength={254}
      />
    </label>
    {!isProfile && <div className="account-field">
      <label htmlFor={`${mode}-password`}>パスワード</label>
      <span className="password-input">
        <input
          id={`${mode}-password`}
          name="password"
          aria-label="パスワード"
          type={passwordVisible ? "text" : "password"}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          minLength={6}
          required
        />
        <button
          type="button"
          aria-label={passwordVisible ? "パスワードを隠す" : "パスワードを表示"}
          aria-pressed={passwordVisible}
          onClick={() => setPasswordVisible((visible) => !visible)}
        >
          {passwordVisible ? "隠す" : "表示"}
        </button>
      </span>
    </div>}
    {mode === "register" && <div className="account-field">
      <label htmlFor="register-password-confirmation">パスワード確認</label>
      <span className="password-input">
        <input
          id="register-password-confirmation"
          name="passwordConfirmation"
          aria-label="パスワード確認"
          type={confirmationVisible ? "text" : "password"}
          autoComplete="new-password"
          minLength={6}
          required
        />
        <button
          type="button"
          aria-label={confirmationVisible ? "確認用パスワードを隠す" : "確認用パスワードを表示"}
          aria-pressed={confirmationVisible}
          onClick={() => setConfirmationVisible((visible) => !visible)}
        >
          {confirmationVisible ? "隠す" : "表示"}
        </button>
      </span>
    </div>}
    {isProfile && <>
      <label className="account-field">
        <span>ユーザー名</span>
        <input
          name="username"
          aria-label="ユーザー名"
          type="text"
          autoComplete="nickname"
          defaultValue={profile.username}
          required
        />
      </label>
      <fieldset className="gender-field">
        <legend>性別</legend>
        {["男性", "女性", "その他"].map((label) => <label key={label}>
          <input
            type="radio"
            name="gender"
            value={label}
            defaultChecked={profile.gender === label}
            required
          />
          {label}
        </label>)}
      </fieldset>
      <label className="year-field">
        <span>生まれた年</span>
        <select aria-label="生まれた年" name="year" defaultValue={profile.year} required>
          <option value="" disabled />
          {Array.from(
            { length: new Date().getFullYear() - 1899 },
            (_, index) => new Date().getFullYear() - index,
          ).map((year) => <option value={year} key={year}>{year}年</option>)}
        </select>
      </label>
    </>}
  </>;
}
