// arka-events-store: holds the staff event posts in one Durable Object and
// serves the one page that lists, adds, and deletes them. No login. The
// posts are not placed onto the site here — that is another lane.

import pageHtml from '../index.html';
import pageScript from '../events.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(pageHtml, {
        headers: { 'content-type': 'text/html; charset=utf-8' },
      });
    }

    if (url.pathname === '/events.js' && request.method === 'GET') {
      return new Response(pageScript, {
        headers: { 'content-type': 'text/javascript; charset=utf-8' },
      });
    }

    if (
      url.pathname === '/api/events' ||
      url.pathname.startsWith('/api/events/')
    ) {
      const stub = env.EVENTS.get(env.EVENTS.idFromName('events'));
      return stub.fetch(request);
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  },
};

export class EventStore {
  constructor(ctx, env) {
    this.ctx = ctx;
    this.env = env;
  }

  async fetch(request) {
    await this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS posts (
         id text primary key,
         date text not null,
         title text not null,
         place text not null default '',
         summary text not null default ''
       )`
    );

    const url = new URL(request.url);

    if (url.pathname === '/api/events' && request.method === 'GET') {
      return this.list();
    }

    if (url.pathname === '/api/events' && request.method === 'POST') {
      return this.add(request);
    }

    const match = url.pathname.match(/^\/api\/events\/([^/]+)$/);
    if (match && request.method === 'DELETE') {
      return this.remove(decodeURIComponent(match[1]));
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  }

  // A post is { id, date, title, place, summary }. id is a UUID the store
  // makes; date is YYYY-MM-DD; summary may be empty.

  async list() {
    const result = await this.ctx.storage.sql.exec(
      `SELECT id, date, title, place, summary FROM posts ORDER BY date, rowid`
    );
    return Response.json(result.toArray());
  }

  async add(request) {
    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: 'body must be valid JSON' }, { status: 400 });
    }

    const date = typeof body.date === 'string' ? body.date.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || title === '') {
      return Response.json(
        { error: 'date (YYYY-MM-DD) and title are required' },
        { status: 400 }
      );
    }

    const post = {
      id: crypto.randomUUID(),
      date,
      title,
      place: typeof body.place === 'string' ? body.place.trim() : '',
      summary: typeof body.summary === 'string' ? body.summary.trim() : '',
    };
    await this.ctx.storage.sql.exec(
      `INSERT INTO posts (id, date, title, place, summary) VALUES (?, ?, ?, ?, ?)`,
      post.id,
      post.date,
      post.title,
      post.place,
      post.summary
    );
    return Response.json(post, { status: 201 });
  }

  async remove(id) {
    const found = await this.ctx.storage.sql.exec(
      `SELECT id FROM posts WHERE id = ?`,
      id
    );
    if (found.toArray().length === 0) {
      return Response.json({ error: 'no post with that id' }, { status: 404 });
    }
    await this.ctx.storage.sql.exec(`DELETE FROM posts WHERE id = ?`, id);
    return Response.json({ ok: true });
  }
}
