// arka-present: stores and serves one live document, files every save as a
// revision, and can revert or restore. No editor UI, no HTML.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    if (
      url.pathname === '/api/doc' ||
      url.pathname === '/api/history' ||
      url.pathname === '/api/revert' ||
      url.pathname === '/api/restore'
    ) {
      const stub = env.PRESENTS.get(env.PRESENTS.idFromName('live'));
      return stub.fetch(request);
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  },
};

export class PresentStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    await this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS docs (
         id text primary key,
         body text not null,
         saved_at text not null
       )`
    );
    await this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS revisions (
         id text primary key,
         saved_at text not null,
         body text not null
       )`
    );

    const url = new URL(request.url);

    if (url.pathname === '/api/doc' && request.method === 'GET') {
      return this.getDoc();
    }

    if (url.pathname === '/api/doc' && request.method === 'PUT') {
      return this.putDoc(request);
    }

    if (url.pathname === '/api/history' && request.method === 'GET') {
      return this.getHistory();
    }

    if (url.pathname === '/api/revert' && request.method === 'POST') {
      return this.revertDoc();
    }

    if (url.pathname === '/api/restore' && request.method === 'POST') {
      return this.restoreDoc(request);
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  }

  // The revision rules below are the ones in present/history.js. That module
  // stays the spec, but the worker cannot load a file outside its directory,
  // so the rules are repeated here:
  // 1. PUT /api/doc, after it stores the live row, also inserts one
  //    revisions row: the id is a random UUID, saved_at is the same timestamp
  //    as the live row, body is the stored JSON text. Older revisions are
  //    never deleted.
  // 2. GET /api/history returns the revisions oldest first, as
  //    [{ id, savedAt, body }], with body parsed from the stored text.
  // 3. POST /api/revert reads the live saved_at, finds the newest revision
  //    whose saved_at is strictly earlier, copies that body into the live row
  //    under a new saved_at, and inserts that copy as a new revision. 409
  //    when there is no earlier revision.
  // 4. POST /api/restore reads { at } from its JSON body, finds the revision
  //    with that saved_at, and copies it forward the same way. 404 when at
  //    does not exist.

  async getDoc() {
    const result = await this.ctx.storage.sql.exec(
      `SELECT body FROM docs WHERE id = ?`,
      'live'
    );
    const rows = result.toArray();
    if (rows.length === 0) {
      return Response.json({ error: 'no live document' }, { status: 404 });
    }
    return new Response(rows[0].body, {
      headers: { 'content-type': 'application/json' },
    });
  }

  async putDoc(request) {
    const text = await request.text();

    let body;
    try {
      body = JSON.parse(text);
    } catch {
      return Response.json({ error: 'body must be valid JSON' }, { status: 400 });
    }

    // The document schema is owned by present/doc.js on its own branch.
    // Only the JSON parse above happens here; shape is not checked.
    const savedAt = new Date().toISOString();
    await this.ctx.storage.sql.exec(
      `INSERT INTO docs (id, body, saved_at) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET body = excluded.body, saved_at = excluded.saved_at`,
      'live',
      text,
      savedAt
    );
    await this.insertRevision(text, savedAt);

    return Response.json({ body, saved_at: savedAt });
  }

  // Rules: present/history.js, rule 2 in the block above.
  async getHistory() {
    const result = await this.ctx.storage.sql.exec(
      `SELECT id, saved_at, body FROM revisions ORDER BY saved_at ASC, rowid ASC`
    );
    const rows = result.toArray();
    return Response.json(
      rows.map((row) => ({
        id: row.id,
        savedAt: row.saved_at,
        body: JSON.parse(row.body),
      }))
    );
  }

  // Rules: present/history.js, rule 3 in the block above.
  async revertDoc() {
    const live = await this.ctx.storage.sql.exec(
      `SELECT saved_at FROM docs WHERE id = ?`,
      'live'
    );
    const liveRows = live.toArray();

    let previous = [];
    if (liveRows.length > 0) {
      const result = await this.ctx.storage.sql.exec(
        `SELECT body FROM revisions WHERE saved_at < ?
         ORDER BY saved_at DESC, rowid DESC LIMIT 1`,
        liveRows[0].saved_at
      );
      previous = result.toArray();
    }

    if (previous.length === 0) {
      return Response.json(
        { error: 'no revision before the live one to revert to' },
        { status: 409 }
      );
    }

    return this.copyForward(previous[0].body, new Date().toISOString());
  }

  // Rules: present/history.js, rule 4 in the block above.
  async restoreDoc(request) {
    const text = await request.text();

    let at;
    try {
      at = JSON.parse(text).at;
    } catch {
      return Response.json({ error: 'body must be valid JSON' }, { status: 400 });
    }
    if (typeof at !== 'string') {
      return Response.json({ error: `no revision at ${at}` }, { status: 404 });
    }

    const result = await this.ctx.storage.sql.exec(
      `SELECT body FROM revisions WHERE saved_at = ? ORDER BY rowid DESC LIMIT 1`,
      at
    );
    const rows = result.toArray();
    if (rows.length === 0) {
      return Response.json({ error: `no revision at ${at}` }, { status: 404 });
    }

    return this.copyForward(rows[0].body, new Date().toISOString());
  }

  // Rules: present/history.js, rule 1 in the block above.
  async insertRevision(text, savedAt) {
    await this.ctx.storage.sql.exec(
      `INSERT INTO revisions (id, saved_at, body) VALUES (?, ?, ?)`,
      crypto.randomUUID(),
      savedAt,
      text
    );
  }

  // Rules: present/history.js, rules 3 and 4 in the block above. A revert or
  // restore never rewrites history: the older body is copied into the live
  // row under a new saved_at and filed as one more revision.
  async copyForward(bodyText, savedAt) {
    await this.ctx.storage.sql.exec(
      `INSERT INTO docs (id, body, saved_at) VALUES (?, ?, ?)
       ON CONFLICT (id) DO UPDATE SET body = excluded.body, saved_at = excluded.saved_at`,
      'live',
      bodyText,
      savedAt
    );
    await this.insertRevision(bodyText, savedAt);

    return Response.json({ body: JSON.parse(bodyText), saved_at: savedAt });
  }
}
