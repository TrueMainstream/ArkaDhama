// arka-present: stores and serves one live document. No editor UI, no HTML.

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') {
      return Response.json({ ok: true });
    }

    if (url.pathname === '/api/doc') {
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

    const url = new URL(request.url);

    if (url.pathname === '/api/doc' && request.method === 'GET') {
      return this.getDoc();
    }

    if (url.pathname === '/api/doc' && request.method === 'PUT') {
      return this.putDoc(request);
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  }

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

    return Response.json({ body, saved_at: savedAt });
  }
}
