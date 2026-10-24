import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizePhone,
  isUuid,
  validateOtpRequest,
  validateOtpVerification,
  validateProfileUpdate,
  validateVoteRequest,
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

test("電話番号の全角数字と区切り文字を正規化する", () => {
  assert.equal(normalizePhone("+８１ (90) 1234-5678"), "+819012345678");
});

test("OTP送信はE.164形式だけを受け付ける", () => {
  assert.equal(validateOtpRequest({ phone: "09012345678", flow: "sign-in" }).ok, false);
  assert.equal(validateOtpRequest({ phone: "+819012345678", flow: "sign-in" }).ok, true);
});

test("OTP検証は6桁コードを要求する", () => {
  assert.equal(
    validateOtpVerification({ phone: "+819012345678", flow: "sign-in", token: "12345" }).ok,
    false,
  );
  assert.equal(
    validateOtpVerification({ phone: "+819012345678", flow: "sign-in", token: "123456" }).ok,
    true,
  );
});

test("新規登録ではプロフィール入力を要求する", () => {
  assert.equal(
    validateOtpVerification({ phone: "+819012345678", flow: "sign-up", token: "123456" }).ok,
    false,
  );
  assert.equal(
    validateOtpVerification({
      phone: "+819012345678",
      flow: "sign-up",
      token: "123456",
      gender: "その他",
      year: 2000,
    }).ok,
    true,
  );
});

test("プロフィール更新は許可された性別と生年だけを受け付ける", () => {
  assert.equal(validateProfileUpdate({ gender: "未指定", year: 2000 }).ok, false);
  assert.equal(validateProfileUpdate({ gender: "女性", year: 2000 }).ok, true);
});
