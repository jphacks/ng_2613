import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const email = process.argv[2];

if (!email) {
  console.error("Usage: node scripts/generate-test-login.mjs <email>");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  throw new Error("Supabase環境変数が設定されていません");
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
});

if (error) {
  throw error;
}

const tokenHash = data.properties?.hashed_token;

if (!tokenHash) {
  throw new Error("認証用トークンを取得できませんでした");
}

const url = new URL("http://localhost:3000/auth/confirm");

url.searchParams.set("token_hash", tokenHash);
url.searchParams.set("type", "email");

console.log("\nテスト用ログインURL:");
console.log(url.toString());
