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

  // 会員情報変更はマージ前の UI（ユーザー名・性別・生年月日）に合わせる。
  // 「回答しない」と未入力の生年月日は空文字で送り、バックエンドで null として保存する。
  if (isProfile) {
    return <>
      <label className="account-field">
        <span>ユーザー名（必須）</span>
        <input name="username" aria-label="ユーザー名" autoComplete="nickname" defaultValue={profile.username} required pattern=".*\S.*" />
      </label>
      <fieldset className="gender-field">
        <legend>性別（任意）</legend>
        {["男性", "女性", "その他", "回答しない"].map((label) => (
          <label key={label}>
            <input type="radio" name="gender" value={label === "回答しない" ? "" : label} defaultChecked={profile.gender === (label === "回答しない" ? "" : label)} />
            {label}
          </label>
        ))}
      </fieldset>
      <label className="account-field">
        <span>生年月日（任意）</span>
        <input name="birthDate" aria-label="生年月日" type="date" autoComplete="bday" defaultValue={profile.birthDate} min="1900-01-01" />
      </label>
    </>;
  }

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
        maxLength={254}
      />
    </label>
    <div className="account-field">
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
    </div>
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
  </>;
}
