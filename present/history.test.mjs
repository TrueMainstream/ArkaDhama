import test from "node:test";
import assert from "node:assert/strict";

import { createHistory } from "./history.js";

function seedThree() {
  const history = createHistory();
  const first = history.publish({ title: "first" }, "2026-11-17T10:00:00.000Z");
  const second = history.publish({ title: "second" }, "2026-11-17T11:00:00.000Z");
  const third = history.publish({ title: "third" }, "2026-11-17T12:00:00.000Z");
  return { history, first, second, third };
}

test("publish three bodies: live() is the third, list() has three", () => {
  const { history } = seedThree();

  assert.deepEqual(history.live().body, { title: "third" });
  assert.equal(history.live().savedAt, "2026-11-17T12:00:00.000Z");
  assert.equal(history.list().length, 3);
});

test("revert returns the second body and list() has four", () => {
  const { history } = seedThree();

  const reverted = history.revert("2026-11-17T13:00:00.000Z");

  assert.deepEqual(reverted.body, { title: "second" });
  assert.equal(reverted.savedAt, "2026-11-17T13:00:00.000Z");
  assert.deepEqual(history.live(), reverted);
  assert.equal(history.list().length, 4);
});

test("restore of the first savedAt returns the first body and list() has five", () => {
  const { history, first } = seedThree();
  history.revert("2026-11-17T13:00:00.000Z");

  const restored = history.restore("2026-11-17T10:00:00.000Z", "2026-11-17T14:00:00.000Z");

  assert.deepEqual(restored.body, { title: "first" });
  assert.equal(restored.savedAt, "2026-11-17T14:00:00.000Z");
  assert.notEqual(restored.id, first.id);
  assert.deepEqual(
    history.list().map((r) => r.body),
    [
      { title: "first" },
      { title: "second" },
      { title: "third" },
      { title: "second" },
      { title: "first" },
    ],
  );
});

test("revert with only one revision throws", () => {
  const history = createHistory();
  history.publish({ title: "only" }, "2026-11-17T10:00:00.000Z");

  assert.throws(() => history.revert("2026-11-17T11:00:00.000Z"));
});

test("restore of an unknown time throws", () => {
  const { history } = seedThree();

  assert.throws(() => history.restore("2020-01-01T00:00:00.000Z", "2026-11-17T13:00:00.000Z"));
});
