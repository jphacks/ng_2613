import assert from "node:assert/strict";
import test from "node:test";
import { cosineSimilarity, reactionScore, selectRepresentatives, type RepresentativeCandidate } from "./select.ts";

function candidate(id: string, agree: number, disagree: number, embedding: number[] | null = null, createdAt = "2026-10-01T00:00:00Z"): RepresentativeCandidate {
  return { id, createdAt, agreeReactions: agree, disagreeReactions: disagree, embedding };
}

test("両方の側からなるほどをもらった意見ほど点数が高い", () => {
  assert.equal(reactionScore({ agreeReactions: 2, disagreeReactions: 2 }), 6);
  assert.equal(reactionScore({ agreeReactions: 5, disagreeReactions: 0 }), 5);
});

test("コサイン類似度は同じ向きで1、直交で0、長さが違えば0", () => {
  assert.equal(cosineSimilarity([1, 0], [2, 0]), 1);
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
  assert.equal(cosineSimilarity([1, 0], [1, 0, 0]), 0);
});

test("ベクトルがなければ点数の高い順に選ぶ", () => {
  const result = selectRepresentatives([
    candidate("a", 5, 0),
    candidate("b", 2, 2),
    candidate("c", 1, 0),
    candidate("d", 0, 0),
  ]);
  assert.deepEqual(result, ["b", "a", "c"]);
});

test("なるほどがなければ新しい順に選ぶ", () => {
  const result = selectRepresentatives([
    candidate("old", 0, 0, null, "2026-10-01T00:00:00Z"),
    candidate("new", 0, 0, null, "2026-10-03T00:00:00Z"),
    candidate("mid", 0, 0, null, "2026-10-02T00:00:00Z"),
  ]);
  assert.deepEqual(result, ["new", "mid", "old"]);
});

test("1件目とほぼ同じ観点の意見は、ほかに候補があれば選ばない", () => {
  const result = selectRepresentatives([
    candidate("top", 3, 3, [1, 0, 0]),
    candidate("same", 3, 2, [0.99, 0.01, 0]),
    candidate("other1", 1, 1, [0, 1, 0]),
    candidate("other2", 1, 0, [0, 0, 1]),
  ]);
  assert.deepEqual(result, ["top", "other1", "other2"]);
});

test("候補が足りなければ、似ている意見でも選ぶ", () => {
  const result = selectRepresentatives([
    candidate("top", 3, 3, [1, 0]),
    candidate("same", 3, 2, [1, 0]),
  ]);
  assert.deepEqual(result, ["top", "same"]);
});
