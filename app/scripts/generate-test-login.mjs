import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { fileURLToPath } from "node:url";

const projectDirectory = fileURLToPath(new URL("..", import.meta.url));
const { loadEnvConfig } = nextEnv;
loadEnvConfig(projectDirectory);

const email = process.argv[2]?.trim().toLowerCase();

if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("Usage: node scripts/generate-test-login.mjs test@example.com");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
  console.error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SECRET_KEY を .env.local に設定してください。");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, secretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email,
});

if (error) {
  console.error(`テストログインURLを生成できませんでした: ${error.message}`);
  process.exit(1);
}

const hashedToken = data.properties?.hashed_token;
if (!hashedToken) {
  console.error("Supabaseから認証用トークンを取得できませんでした。");
  process.exit(1);
}

const confirmUrl = new URL("/auth/confirm", "http://localhost:3000");
confirmUrl.searchParams.set("token_hash", hashedToken);
confirmUrl.searchParams.set("type", "email");

console.log(confirmUrl.toString());
