import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// RLS を通らないサーバー専用の接続。代表意見の選択（なるほどの数・埋め込み）にだけ使う。
// キーはブラウザに出さない。設定がなければ null を返し、呼び出し側で使わずに済ませる。
export function createAdminClient() {
  if (typeof window !== "undefined") throw new Error("サーバー専用のクライアントです。");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) return null;
  return createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
