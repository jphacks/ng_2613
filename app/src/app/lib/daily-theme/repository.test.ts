import assert from "node:assert/strict";
import test from "node:test";
import { getDateInTokyo, getStoragePath, getTokyoDayRange } from "./repository.ts";

test("UTCの日付ではなく日本時間の日付を返す", () => {
  assert.equal(getDateInTokyo(new Date("2026-10-24T15:00:00.000Z")), "2026-10-25");
});

test("日本時間の日付境界の直前は前日を返す", () => {
  assert.equal(getDateInTokyo(new Date("2026-10-24T14:59:59.999Z")), "2026-10-24");
});

test("日本時間の一日をUTCの検索範囲に変換する", () => {
  assert.deepEqual(getTokyoDayRange(new Date("2026-10-25T03:00:00.000Z")), {
    start: "2026-10-24T15:00:00.000Z",
    end: "2026-10-25T15:00:00.000Z",
    day: "2026-10-25",
  });
});

test("Storage内パスと既存の公開URLから動画パスを取得する", () => {
  assert.equal(getStoragePath("daily/2026-10-25.mp4"), "daily/2026-10-25.mp4");
  assert.equal(getStoragePath("videos/daily/2026-10-25.mp4"), "daily/2026-10-25.mp4");
  assert.equal(
    getStoragePath("https://example.supabase.co/storage/v1/object/public/videos/rights-30.mp4"),
    "rights-30.mp4",
  );
});
