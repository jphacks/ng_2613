import assert from "node:assert/strict";
import test from "node:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../supabase/database.types";
import { setThreadReaction } from "./reactions.ts";

function mockClient(options: { missing?: boolean; error?: string } = {}) {
  const calls: unknown[] = [];
  const query = {
    select() { return query; },
    eq(column: string, value: string) { calls.push([column, value]); return query; },
    async maybeSingle() { return { data: options.missing ? null : { id: "thread" }, error: null }; },
    async upsert(value: unknown, config: unknown) {
      calls.push(["insert", value, config]);
      return { error: options.error ? { code: options.error } : null };
    },
    delete() { calls.push("delete"); return query; },
    then(resolve: (value: { error: { code: string } | null }) => unknown) {
      return Promise.resolve({ error: options.error ? { code: options.error } : null }).then(resolve);
    },
  };
  return { calls, client: { from() { return query; } } as unknown as SupabaseClient<Database> };
}

test("選択を保存し、重複時は投票スナップショットを更新しない", async () => {
  const { client, calls } = mockClient();
  assert.deepEqual(await setThreadReaction(client, "thread", "user", true), { reacted: true });
  assert.ok(calls.some(call => JSON.stringify(call) === JSON.stringify([
    "insert", { thread_id: "thread", user_id: "user" }, { onConflict: "thread_id,user_id", ignoreDuplicates: true },
  ])));
});

test("解除は指定された本人のリアクションだけを削除する", async () => {
  const { client, calls } = mockClient();
  assert.deepEqual(await setThreadReaction(client, "thread", "user", false), { reacted: false });
  assert.deepEqual(calls.slice(-3), ["delete", ["thread_id", "thread"], ["user_id", "user"]]);
});

test("存在しない意見には書き込まない", async () => {
  const { client, calls } = mockClient({ missing: true });
  await assert.rejects(setThreadReaction(client, "thread", "user", true), { kind: "not_found" });
  assert.equal(calls.includes("delete"), false);
  assert.equal(calls.some(call => Array.isArray(call) && call[0] === "insert"), false);
});

test("権限拒否と通信失敗を成功として返さない", async () => {
  await assert.rejects(setThreadReaction(mockClient({ error: "42501" }).client, "thread", "user", true), { kind: "closed" });
  await assert.rejects(setThreadReaction(mockClient({ error: "500" }).client, "thread", "user", false), { kind: "unknown" });
});
