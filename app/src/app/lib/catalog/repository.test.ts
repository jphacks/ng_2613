import assert from "node:assert/strict";
import test from "node:test";
import { buildCatalog } from "./repository.ts";

test("ジャンル、中分類、公開トピックの階層と並び順を構築する", () => {
  const catalog = buildCatalog(
    [
      { id: "g2", name: "仕事", description: null, sort_order: 2, created_at: "" },
      { id: "g1", name: "お金", description: null, sort_order: 1, created_at: "" },
    ],
    [
      { id: "m2", genre_id: "g1", name: "物価・賃金", description: null, sort_order: 2, created_at: "" },
      { id: "m1", genre_id: "g1", name: "税金", description: null, sort_order: 1, created_at: "" },
    ],
    [
      { id: "t2", middle_topic_id: "m1", name: "所得税", description: null, sort_order: 2, status: "locked", created_at: "" },
      { id: "t1", middle_topic_id: "m1", name: "消費税", description: null, sort_order: 1, status: "open", created_at: "" },
      { id: "t3", middle_topic_id: "m1", name: "非公開", description: null, sort_order: 3, status: "hidden", created_at: "" },
    ],
  );

  assert.deepEqual(catalog.genres.map((genre) => genre.name), ["お金", "仕事"]);
  assert.deepEqual(catalog.genres[0].middleTopics.map((topic) => topic.name), ["税金", "物価・賃金"]);
  assert.deepEqual(catalog.genres[0].middleTopics[0].topics.map((topic) => topic.name), ["消費税", "所得税"]);
  assert.equal(catalog.genres[0].middleTopics[0].topics[1].status, "locked");
});
