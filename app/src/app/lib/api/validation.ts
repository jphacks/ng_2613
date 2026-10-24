import type { VoteValue } from "../votes/types";
import type { PostStance } from "../threads/types";

export type Gender = "男性" | "女性" | "その他";

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fields: Record<string, string> };

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PASSWORD_MIN_LENGTH = 6;
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

function validateEmailAndPassword(
  value: unknown,
): ValidationResult<{ email: string; password: string }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const password = typeof value.password === "string" ? value.password : "";
  const fields: Record<string, string> = {};

  if (!email || email.length > 254 || !emailPattern.test(email)) {
    fields.email = "メールアドレスを正しく入力してください。";
  }
  if (!password) {
    fields.password = "パスワードを入力してください。";
  } else if (password.length < PASSWORD_MIN_LENGTH) {
    fields.password = `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください。`;
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { email, password } };
}

export function validateSignInRequest(
  value: unknown,
): ValidationResult<{ email: string; password: string }> {
  return validateEmailAndPassword(value);
}

export function validateSignUpRequest(
  value: unknown,
): ValidationResult<{ email: string; password: string }> {
  const credentials = validateEmailAndPassword(value);
  if (!credentials.ok) return credentials;
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const passwordConfirmation = typeof value.passwordConfirmation === "string"
    ? value.passwordConfirmation
    : "";
  if (passwordConfirmation !== credentials.value.password) {
    return { ok: false, fields: { passwordConfirmation: "パスワードが一致しません。" } };
  }

  return credentials;
}

export function validateProfileUpdate(
  value: unknown,
): ValidationResult<{ username: string; gender: Gender | null; birthDate: string | null }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const fields: Record<string, string> = {};
  const username = typeof value.username === "string" ? value.username.trim() : "";
  // 性別と生年月日は任意。未入力（空文字・null・項目なし）は「回答しない」として null で保存する。
  const gender = typeof value.gender === "string" && value.gender.trim() ? value.gender.trim() : null;
  const birthDate = typeof value.birthDate === "string" && value.birthDate.trim() ? value.birthDate.trim() : null;

  if (!username) {
    fields.username = "ユーザー名を入力してください。";
  }
  if (gender !== null && !genders.includes(gender as Gender)) {
    fields.gender = "性別を選択してください。";
  }
  if (birthDate !== null && !isValidBirthDate(birthDate)) {
    fields.birthDate = "生年月日を正しく入力してください。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { username, gender: gender as Gender | null, birthDate } };
}

// YYYY-MM-DD 形式で実在する日付か（2月30日などを弾く）、1900年以降かつ未来でないかを確かめる。
function isValidBirthDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  return date.getUTCFullYear() >= 1900 && date.getTime() <= Date.now();
}
