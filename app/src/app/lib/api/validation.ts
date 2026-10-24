export type AuthFlow = "sign-in" | "sign-up";
export type Gender = "男性" | "女性" | "その他";

type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; fields: Record<string, string> };

const phonePattern = /^\+[1-9]\d{7,14}$/;
const otpPattern = /^\d{6}$/;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const genders: Gender[] = ["男性", "女性", "その他"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function normalizePhone(value: string) {
  return value
    .replace(/[０-９]/g, (character) => String(character.charCodeAt(0) - 0xff10))
    .replace(/[\s\-()]/g, "");
}

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

export function validateOtpRequest(
  value: unknown,
): ValidationResult<{ phone: string; flow: AuthFlow }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const phone = typeof value.phone === "string" ? normalizePhone(value.phone) : "";
  const flow = value.flow;
  const fields: Record<string, string> = {};

  if (!phonePattern.test(phone)) {
    fields.phone = "電話番号は+81から始まる国際形式で入力してください。";
  }
  if (flow !== "sign-in" && flow !== "sign-up") {
    fields.flow = "認証処理の種類が正しくありません。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { phone, flow: flow as AuthFlow } };
}

export function validateOtpVerification(
  value: unknown,
): ValidationResult<{
  phone: string;
  token: string;
  flow: AuthFlow;
  gender?: Gender;
  year?: number;
}> {
  const base = validateOtpRequest(value);
  if (!base.ok) {
    return { ok: false, fields: base.fields };
  }
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const token = typeof value.token === "string" ? value.token.trim() : "";
  const fields: Record<string, string> = {};

  if (!otpPattern.test(token)) {
    fields.token = "SMSに記載された6桁の認証コードを入力してください。";
  }

  if (base.value.flow === "sign-up") {
    if (typeof value.gender !== "string" || !genders.includes(value.gender as Gender)) {
      fields.gender = "性別を選択してください。";
    }
    const year = typeof value.year === "number" ? value.year : Number(value.year);
    const currentYear = new Date().getFullYear();
    if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
      fields.year = "生まれた年を正しく選択してください。";
    }

    if (Object.keys(fields).length > 0) {
      return { ok: false, fields };
    }

    return {
      ok: true,
      value: {
        ...base.value,
        token,
        gender: value.gender as Gender,
        year,
      },
    };
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { ...base.value, token } };
}

export function validateProfileUpdate(
  value: unknown,
): ValidationResult<{ gender: Gender; year: number }> {
  if (!isRecord(value)) {
    return { ok: false, fields: { request: "リクエスト形式が正しくありません。" } };
  }

  const fields: Record<string, string> = {};
  const year = typeof value.year === "number" ? value.year : Number(value.year);
  const currentYear = new Date().getFullYear();

  if (typeof value.gender !== "string" || !genders.includes(value.gender as Gender)) {
    fields.gender = "性別を選択してください。";
  }
  if (!Number.isInteger(year) || year < 1900 || year > currentYear) {
    fields.year = "生まれた年を正しく選択してください。";
  }

  return Object.keys(fields).length > 0
    ? { ok: false, fields }
    : { ok: true, value: { gender: value.gender as Gender, year } };
}
