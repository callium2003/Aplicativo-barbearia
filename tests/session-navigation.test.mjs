import assert from "node:assert/strict";
import test from "node:test";
import { createSessionNavigationHandler } from "../app/painel/session-navigation.mjs";

const session = (id) => ({ user: { id } });
function setup() {
  const actions = [];
  return { actions, handle: createSessionNavigationHandler((action) => actions.push(action)) };
}

test("refocusing and renewing the same session preserves the open form", () => {
  const { actions, handle } = setup();
  handle("INITIAL_SESSION", session("owner-a"));
  handle("SIGNED_IN", session("owner-a"));
  handle("TOKEN_REFRESHED", session("owner-a"));
  handle("SIGNED_IN", session("owner-a"));
  assert.deepEqual(actions, []);
});

test("an actual account switch revalidates the current route", () => {
  const { actions, handle } = setup();
  handle("INITIAL_SESSION", session("owner-a"));
  handle("SIGNED_IN", session("barber-b"));
  assert.deepEqual(actions, ["reload"]);
});

test("logout leaves the protected route even before initial session arrives", () => {
  const { actions, handle } = setup();
  handle("SIGNED_OUT", null);
  assert.deepEqual(actions, ["sign-out"]);
});

test("signed-in arriving before initial restoration does not create a reload loop", () => {
  const { actions, handle } = setup();
  handle("SIGNED_IN", session("owner-a"));
  handle("INITIAL_SESSION", session("owner-a"));
  handle("SIGNED_IN", session("owner-a"));
  assert.deepEqual(actions, []);
});

test("signing in after a known empty session revalidates access", () => {
  const { actions, handle } = setup();
  handle("INITIAL_SESSION", null);
  handle("SIGNED_IN", session("owner-a"));
  assert.deepEqual(actions, ["reload"]);
});
