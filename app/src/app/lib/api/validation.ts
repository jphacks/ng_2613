import type { VoteValue } from "../votes/types";
import type { PostStance } from "../threads/types";

export type AuthFlow = "sign-in" | "sign-up";
export type Gender = "男性" | "女性" | "その他";

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fields: Record<string, string> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const otpPattern = /^\d{6}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const genders: Gender[] = ["男性", "女性", "その他"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function validateVoteRequest(value: unknown): ValidationResult<{ value: VoteValue }> {
  if (
    !isRecord(value)
    || typeof value.value !== "number"
    || !Number.isInteger(value.value)
    || value.value < 1
    || value.value > 5
  ) {
    return { ok: false, fields: { value: "投票値は1から5の整数で指定してください。" } };
  }
  return { ok: true, value: { value: value.value as VoteValue } };
}

function validatePostStance(value: unknown): value is PostStance {
  return value === "agree" || value === "disagree";
}

export function validateThreadRequest(
  value: unknown,
): ValidationResult<{ title: string; body: string; stance: PostStance }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const fields: Record<string, string> = {};
  if (!title || title.length > 120) fields.title = "タイトルは1文字以上120文字以内で入力してください。";
  if (!body || body.length > 5000) fields.body = "本文は1文字以上5000文字以内で入力してください。";
  if (!validatePostStance(value.stance)) fields.stance = "立場を選択してください。";
  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { title, body, stance: value.stance as PostStance } };
}

export function validateCommentRequest(
  value: unknown,
): ValidationResult<{ body: string; stance: PostStance | null }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }
  const body = typeof value.body === "string" ? value.body.trim() : "";
  const fields: Record<string, string> = {};
  if (!body || body.length > 2000) fields.body = "コメントは1文字以上2000文字以内で入力してください。";
  if (value.stance !== null && value.stance !== undefined && !validatePostStance(value.stance)) {
    fields.stance = "立場の指定が正しくありません。";
  }
  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { body, stance: validatePostStance(value.stance) ? value.stance : null } };
}

export function validateOtpRequest(
  value: unknown,
): ValidationResult<{ email: string; flow: AuthFlow }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const flow = value.flow;
  const fields: Record<string, string> = {};

  if (!email || email.length > 254 || !emailPattern.test(email)) {
    fields.email = "メールアドレスを正しく入力してください。";
  }
  if (flow !== "sign-in" && flow !== "sign-up") {
    fields.flow = "認証処理の種類が正しくありません。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { email, flow: flow as AuthFlow } };
}

export function validateOtpVerification(
  value: unknown,
): ValidationResult<{
  email: string;
  token: string;
  flow: AuthFlow;
}> {
  const base = validateOtpRequest(value);
  if (!base.ok) {
    return { ok: false, fields: base.fields };
  }
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const token = typeof value.token === "string"
    ? value.token.trim().replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xff10))
    : "";
  const fields: Record<string, string> = {};

  if (!otpPattern.test(token)) {
    fields.token = "メールに記載された6桁の認証コードを入力してください。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { ...base.value, token } };
}

export function validateProfileUpdate(
  value: unknown,
): ValidationResult<{ username: string; gender: Gender; year: number }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const fields: Record<string, string> = {};
  const username = typeof value.username === "string" ? value.username.trim() : "";
  const year = typeof value.year === "number" ? value.year : Number(value.year);
  const currentYear = new Date().getFullYear();

  if (!username) {
    fields.username = "ユーザー名を入力してください。";
  }
  if (typeof value.gender !== "string" || !genders.includes(value.gender as Gender)) {
    fields.gender = "性別を選択してください。";
  }
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    fields.year = "生まれた年を正しく選択してください。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { username, gender: value.gender as Gender, year } };
}
