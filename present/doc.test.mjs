// Run: node --test present/doc.test.mjs

import test from "node:test";
import assert from "node:assert/strict";

import { emptyDoc, seedDoc, validateDoc } from "./doc.js";

const RIVER_IDS = [
  "events",
  "about",
  "training",
  "communities",
  "dhama",
  "videos",
  "books",
  "articles",
  "contact",
];

function withEventsBlock(overrides = {}) {
  const doc = structuredClone(emptyDoc());
  doc.rivers[0].top.push({
    id: "probe",
    type: "text",
    x: 8,
    y: 8,
    w: 84,
    h: 16,
    text: "probe",
    ...overrides,
  });
  return doc;
}

test("emptyDoc has the nine rivers in order and validates", () => {
  const doc = emptyDoc();
  assert.equal(doc.rivers.length, 9);
  assert.deepEqual(
    doc.rivers.map((r) => r.id),
    RIVER_IDS
  );
  assert.deepEqual(validateDoc(doc), { ok: true });
});

test("validateDoc fails closed when a river is removed", () => {
  const doc = structuredClone(emptyDoc());
  doc.rivers.splice(4, 1); // dhama
  const result = validateDoc(doc);
  assert.equal(result.ok, false);
  assert.ok(Array.isArray(result.errors) && result.errors.length > 0);
  assert.ok(result.errors.every((e) => typeof e === "string"));
});

test("a mask on the bottom layer fails", () => {
  const doc = structuredClone(emptyDoc());
  doc.rivers[0].bottom.push({
    id: "m",
    type: "mask",
    x: 0,
    y: 0,
    w: 100,
    h: 100,
    shape: "rect",
  });
  const result = validateDoc(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("mask")));
});

// The shape the editor places: an event block on either layer. The public
// page fetches the posts; the document only says which ones and how many.
function withEventBlock(layer, overrides = {}) {
  const doc = structuredClone(emptyDoc());
  doc.rivers[0][layer].push({
    id: "probe-event",
    type: "event",
    x: 8,
    y: 40,
    w: 84,
    h: 30,
    show: "upcoming",
    limit: 5,
    ...overrides,
  });
  return doc;
}

test('an event block with show "upcoming" passes on top and on bottom', () => {
  for (const layer of ["top", "bottom"]) {
    assert.deepEqual(validateDoc(withEventBlock(layer)), { ok: true }, layer);
  }
});

test('an event block with show "maybe" fails', () => {
  const result = validateDoc(withEventBlock("top", { show: "maybe" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("show")));
});

test("x of 120 fails", () => {
  const result = validateDoc(withEventsBlock({ x: 120 }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("x")));
});

test('href "javascript:alert(1)" fails', () => {
  const result = validateDoc(withEventsBlock({ href: "javascript:alert(1)" }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("href")));
});

test("site hrefs pass: /books, #dhyana, https://www.srinivasarka.org/books", () => {
  for (const href of ["/books", "#dhyana", "https://www.srinivasarka.org/books"]) {
    assert.deepEqual(validateDoc(withEventsBlock({ href })), { ok: true }, href);
  }
});

test("seedDoc passes validateDoc with every bottom layer empty", () => {
  const doc = seedDoc();
  assert.deepEqual(validateDoc(doc), { ok: true });
  for (const river of doc.rivers) {
    assert.deepEqual(river.bottom, [], river.id);
  }
});

test('seedDoc events top contains "Srinivas Arka is in India."', () => {
  const events = seedDoc().rivers.find((r) => r.id === "events");
  const text = events.top.map((b) => b.text).join("\n");
  assert.ok(text.includes("Srinivas Arka is in India."));
});
