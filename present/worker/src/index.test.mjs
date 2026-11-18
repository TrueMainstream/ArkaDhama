// Run with: node --test present/worker/src/index.test.mjs
// present/history.js stays the spec for the revision rules; these tests
// check the worker's copy of them against a real SQLite database, plus the
// draft/published split: PUT edits the draft, publish copies it to live.

import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';

import { PresentStore } from './index.js';

const BASE = 'https://present.test';

function makeStore() {
  const db = new DatabaseSync(':memory:');
  const sql = {
    async exec(statement, ...params) {
      const prepared = db.prepare(statement);
      if (/^\s*(select|with)\b/i.test(statement)) {
        return { toArray: () => prepared.all(...params) };
      }
      prepared.run(...params);
      return { toArray: () => [] };
    },
  };
  return { store: new PresentStore({ storage: { sql } }, {}), db };
}

function request(method, path, body) {
  return new Request(BASE + path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  });
}

// Any fetch creates the tables; seeding then goes straight through SQL so
// saved_at values are fixed instead of taken from the wall clock.
async function seedHistory(db, entries) {
  const insert = db.prepare(
    `INSERT INTO revisions (id, saved_at, body) VALUES (?, ?, ?)`
  );
  for (const [id, savedAt, body] of entries) {
    insert.run(id, savedAt, JSON.stringify(body));
  }
}

test('PUT /api/doc files one revision per save', async () => {
  const { store } = makeStore();

  const first = await store.fetch(request('PUT', '/api/doc', { river: 'body' }));
  assert.equal(first.status, 200);
  const firstJson = await first.json();

  const second = await store.fetch(request('PUT', '/api/doc', { river: 'mind' }));
  const secondJson = await second.json();

  const history = await store.fetch(request('GET', '/api/history'));
  assert.equal(history.status, 200);
  const revisions = await history.json();

  assert.equal(revisions.length, 2);
  assert.equal(revisions[0].savedAt, firstJson.saved_at);
  assert.equal(revisions[1].savedAt, secondJson.saved_at);
  assert.match(revisions[0].id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  assert.notEqual(revisions[0].id, revisions[1].id);
  assert.deepEqual(revisions[0].body, { river: 'body' });
  assert.deepEqual(revisions[1].body, { river: 'mind' });

  const doc = await store.fetch(request('GET', '/api/doc'));
  assert.deepEqual(await doc.json(), { river: 'mind' });
});

test('GET /api/history returns revisions oldest first by saved_at', async () => {
  const { store, db } = makeStore();
  await store.fetch(request('GET', '/api/doc')); // 404, but creates the tables

  // Inserted out of order on purpose: ordering must follow saved_at.
  await seedHistory(db, [
    ['seed-b', '2020-01-01T00:00:02.000Z', { step: 2 }],
    ['seed-a', '2020-01-01T00:00:01.000Z', { step: 1 }],
  ]);

  const revisions = await (
    await store.fetch(request('GET', '/api/history'))
  ).json();

  assert.deepEqual(
    revisions.map((r) => r.id),
    ['seed-a', 'seed-b']
  );
  assert.deepEqual(revisions[0].body, { step: 1 });
  assert.deepEqual(revisions[1].body, { step: 2 });
});

test('POST /api/revert copies the newest strictly earlier revision forward', async () => {
  const { store, db } = makeStore();
  await store.fetch(request('GET', '/api/doc')); // 404, but creates the tables

  const empty = await store.fetch(request('POST', '/api/revert'));
  assert.equal(empty.status, 409);

  await store.fetch(request('PUT', '/api/doc', { step: 1 }));
  const alone = await store.fetch(request('POST', '/api/revert'));
  assert.equal(alone.status, 409); // its own revision is not strictly earlier

  await seedHistory(db, [
    ['seed-1', '2020-01-01T00:00:01.000Z', { step: 1 }],
    ['seed-2', '2020-01-01T00:00:02.000Z', { step: 2 }],
    ['seed-3', '2020-01-01T00:00:03.000Z', { step: 3 }],
  ]);
  db.prepare(
    `INSERT INTO docs (id, body, saved_at) VALUES ('draft', ?, ?)
     ON CONFLICT (id) DO UPDATE SET body = excluded.body, saved_at = excluded.saved_at`
  ).run(JSON.stringify({ step: 3 }), '2020-01-01T00:00:03.000Z');

  const reverted = await store.fetch(request('POST', '/api/revert'));
  assert.equal(reverted.status, 200);
  const json = await reverted.json();
  assert.deepEqual(json.body, { step: 2 });
  assert.notEqual(json.saved_at, '2020-01-01T00:00:03.000Z');

  const doc = await store.fetch(request('GET', '/api/doc'));
  assert.deepEqual(await doc.json(), { step: 2 });

  const revisions = await (
    await store.fetch(request('GET', '/api/history'))
  ).json();
  // seed-1, seed-2, seed-3, the PUT from the 409 check, then the copy.
  assert.equal(revisions.length, 5); // nothing was removed
  assert.deepEqual(revisions[4].body, { step: 2 });
  assert.equal(revisions[4].savedAt, json.saved_at);
});

test('POST /api/restore copies the revision at `at` forward, or 404', async () => {
  const { store, db } = makeStore();
  await store.fetch(request('GET', '/api/doc')); // 404, but creates the tables

  await seedHistory(db, [
    ['seed-1', '2020-01-01T00:00:01.000Z', { step: 1 }],
    ['seed-2', '2020-01-01T00:00:02.000Z', { step: 2 }],
  ]);
  db.prepare(
    `INSERT INTO docs (id, body, saved_at) VALUES ('draft', ?, ?)
     ON CONFLICT (id) DO UPDATE SET body = excluded.body, saved_at = excluded.saved_at`
  ).run(JSON.stringify({ step: 2 }), '2020-01-01T00:00:02.000Z');

  const restored = await store.fetch(
    request('POST', '/api/restore', { at: '2020-01-01T00:00:01.000Z' })
  );
  assert.equal(restored.status, 200);
  const json = await restored.json();
  assert.deepEqual(json.body, { step: 1 });

  const doc = await store.fetch(request('GET', '/api/doc'));
  assert.deepEqual(await doc.json(), { step: 1 });

  const missing = await store.fetch(
    request('POST', '/api/restore', { at: '1999-01-01T00:00:00.000Z' })
  );
  assert.equal(missing.status, 404);

  const revisions = await (
    await store.fetch(request('GET', '/api/history'))
  ).json();
  assert.equal(revisions.length, 3); // the restore filed one more row
  assert.deepEqual(revisions[2].body, { step: 1 });
  assert.equal(revisions[2].savedAt, json.saved_at);
});

test('GET /api/published stays 404 until POST /api/publish copies the draft', async () => {
  const { store } = makeStore();

  const before = await store.fetch(request('GET', '/api/published'));
  assert.equal(before.status, 404);

  await store.fetch(request('PUT', '/api/doc', { river: 'body' }));
  const unpublished = await store.fetch(request('GET', '/api/published'));
  assert.equal(unpublished.status, 404); // a PUT alone never publishes

  const publish = await store.fetch(request('POST', '/api/publish'));
  assert.equal(publish.status, 200);
  const json = await publish.json();
  assert.deepEqual(json.body, { river: 'body' });

  const published = await store.fetch(request('GET', '/api/published'));
  assert.equal(published.status, 200);
  assert.deepEqual(await published.json(), { river: 'body' });

  const revisions = await (
    await store.fetch(request('GET', '/api/history'))
  ).json();
  assert.equal(revisions.length, 2); // the save, then the published copy
  assert.deepEqual(revisions[1].body, { river: 'body' });
  assert.equal(revisions[1].savedAt, json.saved_at);
});

test('a second PUT leaves the published row alone until the next publish', async () => {
  const { store } = makeStore();

  await store.fetch(request('PUT', '/api/doc', { step: 1 }));
  await store.fetch(request('POST', '/api/publish'));

  await store.fetch(request('PUT', '/api/doc', { step: 2 }));
  const published = await store.fetch(request('GET', '/api/published'));
  assert.deepEqual(await published.json(), { step: 1 }); // still the old body

  const doc = await store.fetch(request('GET', '/api/doc'));
  assert.deepEqual(await doc.json(), { step: 2 }); // the draft did move

  await store.fetch(request('POST', '/api/publish'));
  const republished = await store.fetch(request('GET', '/api/published'));
  assert.deepEqual(await republished.json(), { step: 2 });
});
