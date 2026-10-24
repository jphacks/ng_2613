import assert from "node:assert/strict";
import test from "node:test";
import { getPostAuthScreen, hasAuthenticatedSession } from "./auth-flow.ts";

test("ユーザーとセッションの両方がある場合だけ認証成功とする", () => {
  const user = { id: "test-user" };
  const session = { access_token: "test-token" };

  assert.equal(hasAuthenticatedSession({ user, session }), true);
  assert.equal(hasAuthenticatedSession({ user, session: null }), false);
  assert.equal(hasAuthenticatedSession({ user: null, session }), false);
});

test("プロフィール未完了なら登録画面、完了済みならホームへ遷移する", () => {
  assert.equal(getPostAuthScreen({ complete: false }), "profile");
  assert.equal(getPostAuthScreen({ complete: true }), "home");
});
