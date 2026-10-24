import assert from "node:assert/strict";
import test from "node:test";
import {
  isUuid,
  validateSignInRequest,
  validateSignUpRequest,
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

test("ログインはメールアドレスの形式とパスワードを検証する", () => {
  assert.equal(validateSignInRequest({ email: " USER@example.com ", password: "secret" }).ok, true);
  assert.equal(validateSignInRequest({ email: "invalid", password: "secret" }).ok, false);
  assert.equal(validateSignInRequest({ email: `${"a".repeat(250)}@x.jp`, password: "secret" }).ok, false);
  assert.equal(validateSignInRequest({ email: "user@example.com", password: "" }).ok, false);
  assert.equal(validateSignInRequest({ email: "user@example.com", password: "12345" }).ok, false);
});

test("新規登録はパスワード確認の一致を要求する", () => {
  assert.equal(validateSignUpRequest({
    email: "user@example.com", password: "secret", passwordConfirmation: "secret",
  }).ok, true);
  assert.equal(validateSignUpRequest({
    email: "user@example.com", password: "secret", passwordConfirmation: "different",
  }).ok, false);
});

test("プロフィール更新は性別と生年月日は任意で、入力するなら許可された値だけを受け付ける", () => {
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "未指定", birthDate: "2000-04-01" }).ok, false);
  assert.equal(validateProfileUpdate({ username: "", gender: "女性", birthDate: "2000-04-01" }).ok, false);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "女性", birthDate: "2000-04-01" }).ok, true);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "女性", birthDate: "2001-02-29" }).ok, false);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "女性", birthDate: "2999-01-01" }).ok, false);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "女性", birthDate: "2000" }).ok, false);
  assert.equal(validateProfileUpdate({ username: "利用者", gender: "", birthDate: "" }).ok, true);
  assert.equal(validateProfileUpdate({ username: "利用者" }).ok, true);
});
