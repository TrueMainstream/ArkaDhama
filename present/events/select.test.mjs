import test from "node:test";
import assert from "node:assert/strict";

import { postsFor } from "./select.js";

// Seeded out of date order so every test also proves the soonest-first sort.
// "b" is the day before today, "c" is today, "a" is the day after.
const TODAY = "2026-11-17";

function seedThree() {
  return [
    { id: "a", date: "2026-11-18", title: "Night market", place: "Square", summary: "Food stalls." },
    { id: "b", date: "2026-11-16", title: "River walk", place: "North bank", summary: "Easy walk." },
    { id: "c", date: "2026-11-17", title: "Lantern making", place: "Hall", summary: "Paper crafts." },
  ];
}

test("upcoming with today in the middle returns the two later ones, soonest first", () => {
  const shown = postsFor({ show: "upcoming" }, seedThree(), TODAY);

  assert.deepEqual(
    shown.map((post) => post.id),
    ["c", "a"],
  );
});

test("all returns three, soonest first", () => {
  const shown = postsFor({ show: "all" }, seedThree(), TODAY);

  assert.deepEqual(
    shown.map((post) => post.id),
    ["b", "c", "a"],
  );
});

test("limit 1 returns one", () => {
  const shown = postsFor({ show: "all", limit: 1 }, seedThree(), TODAY);

  assert.deepEqual(
    shown.map((post) => post.id),
    ["b"],
  );
});

test("a post dated before today is absent from upcoming", () => {
  const shown = postsFor({ show: "upcoming" }, seedThree(), TODAY);

  assert.ok(!shown.some((post) => post.id === "b"));
});

test("a post with a bad date is skipped", () => {
  const posts = [
    ...seedThree(),
    { id: "d", date: "2026-13-01", title: "Bad month", place: "Nowhere", summary: "Skipped." },
  ];

  assert.equal(postsFor({ show: "all" }, posts, TODAY).length, 3);
  assert.equal(postsFor({ show: "upcoming" }, posts, TODAY).length, 2);
});
