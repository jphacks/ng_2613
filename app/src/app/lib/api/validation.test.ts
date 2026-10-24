import assert from "node:assert/strict";
import test from "node:test";
import {
  isUuid,
  validateOtpRequest,
  validateOtpVerification,
  validateProfileUpdate,
  validateVoteRequest,
  validateThreadRequest,
  validateCommentRequest,
} from "./validation.ts";

test("UUID形式を検証する", () => {
  assert.equal(isUuid("00000000-0000-4000-8000-000000000001"), true);
  assert.equal(isUuid("not-a-uuid"), false);
});

test("投票値は1から5の整数だけを受け付ける", () => {
  assert.equal(validateVoteRequest({ value: 1 }).ok, true);
  assert.equal(validateVoteRequest({ value: 5 }).ok, true);
  assert.equal(validateVoteRequest({ value: 0 }).ok, false);
  assert.equal(validateVoteRequest({ value: 3.5 }).ok, false);
  assert.equal(validateVoteRequest({ value: "3" }).ok, false);
});

test("スレッドとコメントの空白投稿を拒否する", () => {
  assert.equal(validateThreadRequest({ title: " ", body: "本文", stance: "agree" }).ok, false);
  assert.equal(validateThreadRequest({ title: "題名", body: "本文", stance: "agree" }).ok, true);
  assert.equal(validateCommentRequest({ body: "   ", stance: null }).ok, false);
  assert.equal(validateCommentRequest({ body: "コメント", stance: "disagree" }).ok, true);
});

test("OTP送信はメールアドレスの形式と長さを検証する", () => {
  assert.equal(validateOtpRequest({ email: " USER@example.com ", flow: "sign-in" }).ok, true);
  assert.equal(validateOtpRequest({ email: "invalid", flow: "sign-in" }).ok, false);
  assert.equal(validateOtpRequest({ email: `${"a".repeat(250)}@x.jp`, flow: "sign-in" }).ok, false);
});

test("OTP検証は6桁コードを要求する", () => {
  assert.equal(
    validateOtpVerification({ email: "user@example.com", flow: "sign-in", token: "12345" }).ok,
    false,
  );
  assert.equal(
    validateOtpVerification({ email: "user@example.com", flow: "sign-in", token: "123456" }).ok,
    true,
  );
  assert.equal(
    validateOtpVerification({ email: "user@example.com", flow: "sign-in", token: "１２３４５６" }).ok,
    true,
  );
});

test("新規登録のOTP検証後にプロフィールを別途設定できる", () => {
  assert.equal(validateOtpVerification({
    email: "user@example.com", flow: "sign-up", token: "123456",
  }).ok, true);
});

test("プロフィール更新は許可された性別と生年だけを受け付ける", () => {
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "未指定", year: 2000 }).ok, false);
  assert.equal(validateProfileUpdate({ username: "", gender: "女性", year: 2000 }).ok, false);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "女性", year: 2000 }).ok, true);
});
