import { NextResponse } from "next/server";

export type ApiSuccess<T> = { data: T };

export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
};

const privateHeaders = {
  "Cache-Control": "private, no-store",
};

export function success<T>(data: T, status = 200) {
  return NextResponse.json<ApiSuccess<T>>({ data }, { status, headers: privateHeaders });
}

export function failure(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string>,
) {
  return NextResponse.json<ApiError>(
    { error: { code, message, ...(fields ? { fields } : {}) } },
    { status, headers: privateHeaders },
  );
}

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function hasSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return origin === null || origin === new URL(request.url).origin;
}
