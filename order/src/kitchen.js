// Kitchen Durable Object for the Arka Dhama order prototype.
// This one file is the whole API: menu, orders, accounts, sessions, admin.
// Money is integer paise throughout. No alarms, no cron, no heartbeat.

const SESSION_COOKIE = "arka_order_session";
const SESSION_MAX_AGE = 2592000;
const SERVICES = ["dine_in", "takeaway", "delivery"];
const SETTABLE_STATUSES = ["accepted", "ready", "completed", "cancelled"];
const NEXT_STATUSES = {
  placed: ["accepted", "cancelled"],
  accepted: ["ready", "cancelled"],
  ready: ["completed", "cancelled"],
};
const STATUS_TIMESTAMP_COLUMN = {
  accepted: "accepted_at",
  ready: "ready_at",
  completed: "completed_at",
};
const PHOTO_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const PHOTO_MAX_BASE64_LENGTH = 1500000;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

function randomHex(byteCount) {
  const bytes = new Uint8Array(byteCount);
  crypto.getRandomValues(bytes);
  let hex = "";
  for (const byte of bytes) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

async function hashPassword(saltHex, password) {
  const bytes = new TextEncoder().encode(saltHex + ":" + password);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  let hex = "";
  for (const byte of new Uint8Array(digest)) hex += byte.toString(16).padStart(2, "0");
  return hex;
}

function constantTimeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

function sessionCookieHeaders(token) {
  return {
    "set-cookie":
      SESSION_COOKIE + "=" + token + "; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=" + SESSION_MAX_AGE,
  };
}

function clearedSessionCookieHeaders() {
  return {
    "set-cookie": SESSION_COOKIE + "=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  };
}

function readSessionToken(request) {
  const header = request.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const equals = part.indexOf("=");
    if (equals < 0) continue;
    if (part.slice(0, equals).trim() === SESSION_COOKIE) return part.slice(equals + 1).trim();
  }
  return null;
}

function mediaUrl(photoKey) {
  if (!photoKey) return null;
  // Encode each segment, keep the slashes: /media/items/<id>/<file>.jpg, never %2F.
  return "/media/" + photoKey.split("/").map(encodeURIComponent).join("/");
}

function kolkataToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function kolkataOffsetMs(instant) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = {};
  for (const part of formatter.formatToParts(instant)) {
    if (part.type !== "literal") parts[part.type] = part.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return asUtc - instant.getTime();
}

function isDayShape(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  const check = new Date(Date.UTC(year, month - 1, day));
  return check.getUTCFullYear() === year && check.getUTCMonth() === month - 1 && check.getUTCDate() === day;
}

function kolkataDayStart(day) {
  const [year, month, date] = day.split("-").map(Number);
  const utcMidnight = Date.UTC(year, month - 1, date);
  // India has no daylight-saving change, so one refinement pass is already exact.
  let start = utcMidnight - kolkataOffsetMs(new Date(utcMidnight));
  start = utcMidnight - kolkataOffsetMs(new Date(start));
  return start;
}

export class Kitchen {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.sql = state.storage.sql;
    this.ready = state.blockConcurrencyWhile(() => this.migrate());
  }

  async migrate() {
    this.sql.exec(`CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sort INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      price INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      sort INTEGER NOT NULL DEFAULT 0,
      photo_key TEXT,
      active INTEGER NOT NULL DEFAULT 1
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      tax_bps INTEGER NOT NULL DEFAULT 0,
      delivery_enabled INTEGER NOT NULL DEFAULT 0,
      ordering_open INTEGER NOT NULL DEFAULT 1
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      service TEXT NOT NULL,
      table_no TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      tax INTEGER NOT NULL,
      total INTEGER NOT NULL,
      tax_bps INTEGER NOT NULL,
      placed_at INTEGER NOT NULL,
      accepted_at INTEGER,
      ready_at INTEGER,
      completed_at INTEGER,
      idempotency_key TEXT UNIQUE
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS order_lines (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      name TEXT NOT NULL,
      qty INTEGER NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      unit_price INTEGER NOT NULL,
      line_total INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'guest',
      created_at INTEGER NOT NULL
    )`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`);

    const seedCategories = [
      ["meals", "Meals", 0],
      ["breads", "Breads", 1],
      ["drinks", "Drinks", 2],
      ["sweets", "Sweets", 3],
    ];
    for (const [id, name, sort] of seedCategories) {
      this.sql.exec(
        "INSERT INTO categories (id, name, sort) VALUES (?, ?, ?) ON CONFLICT DO NOTHING",
        id,
        name,
        sort
      );
    }

    const seedItems = [
      ["thali", "meals", "Thali", 18000],
      ["roti", "breads", "Roti", 2000],
      ["chai", "drinks", "Chai", 3000],
      ["ladoo", "sweets", "Ladoo", 4000],
    ];
    for (const [id, categoryId, name, price] of seedItems) {
      this.sql.exec(
        "INSERT INTO items (id, category_id, name, price) VALUES (?, ?, ?, ?) ON CONFLICT DO NOTHING",
        id,
        categoryId,
        name,
        price
      );
    }

    this.sql.exec("INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING");

    const adminPassword = this.env ? this.env.ADMIN_PASSWORD : undefined;
    if (typeof adminPassword === "string" && adminPassword.length > 0) {
      const row = this.one("SELECT COUNT(*) AS n FROM accounts");
      if (row.n === 0) {
        await this.createAccount("admin", "admin@arka-dhama.local", adminPassword, "admin");
      }
    }
  }

  async fetch(request) {
    await this.ready;
    try {
      const url = new URL(request.url);
      let path = url.pathname;
      if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
      const method = request.method;

      if (method === "POST" && path === "/api/register") return await this.handleRegister(request);
      if (method === "POST" && path === "/api/login") return await this.handleLogin(request);
      if (method === "POST" && path === "/api/logout") return this.handleLogout(request);
      if (method === "GET" && path === "/api/me") return await this.handleMe(request);
      if (method === "GET" && path === "/api/menu") return this.handleMenu();

      if (method === "POST" && path === "/api/order") return await this.handleOrderPost(request, false);
      if (method === "POST" && path === "/api/staff/order") return await this.handleOrderPost(request, true);
      if (method === "GET" && path === "/api/staff/orders") return await this.handleStaffOrdersList(request);
      if (method === "GET" && path === "/api/staff/order") return await this.handleStaffOrderGet(request);
      if (method === "POST" && path === "/api/staff/status") return await this.handleStaffStatus(request);

      if (method === "GET" && path === "/api/admin/menu") return await this.handleAdminMenu(request);
      if (method === "POST" && path === "/api/admin/category") return await this.handleAdminCategory(request);
      if (method === "POST" && path === "/api/admin/item") return await this.handleAdminItem(request);
      if (method === "POST" && path === "/api/admin/photo") return await this.handleAdminPhoto(request);
      if (method === "POST" && path === "/api/admin/settings") return await this.handleAdminSettings(request);
      if (method === "GET" && path === "/api/admin/accounts") return await this.handleAdminAccountsList(request);
      if (method === "POST" && path === "/api/admin/account") return await this.handleAdminAccountCreate(request);
      if (method === "POST" && path === "/api/admin/role") return await this.handleAdminRole(request);

      return json({ ok: false, error: "Not found." }, 404);
    } catch (error) {
      console.error("Kitchen error:", error);
      return json({ ok: false, error: "Internal error." }, 500);
    }
  }

  all(statement, params = []) {
    return this.sql.exec(statement, ...params).toArray();
  }

  one(statement, params = []) {
    const rows = this.all(statement, params);
    return rows.length > 0 ? rows[0] : null;
  }

  async readBody(request) {
    try {
      return await request.json();
    } catch {
      return null;
    }
  }

  bodyError(body) {
    if (!body || typeof body !== "object") return json({ ok: false, error: "A JSON body is required." }, 400);
    return null;
  }

  // ---- Accounts, sessions -------------------------------------------------

  accountJson(row) {
    return { id: row.id, username: row.username, email: row.email, role: row.role };
  }

  async createAccount(username, email, password, role) {
    const id = randomHex(8);
    const salt = randomHex(16);
    const hash = await hashPassword(salt, password);
    this.sql.exec(
      "INSERT INTO accounts (id, username, email, password_hash, password_salt, role, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id,
      username,
      email,
      hash,
      salt,
      role,
      Date.now()
    );
    return { id, username, email, role };
  }

  createSession(accountId) {
    const token = randomHex(32);
    this.sql.exec(
      "INSERT INTO sessions (token, account_id, created_at) VALUES (?, ?, ?)",
      token,
      accountId,
      Date.now()
    );
    return token;
  }

  async accountFromRequest(request) {
    const token = readSessionToken(request);
    if (!token) return null;
    return this.one(
      "SELECT a.id, a.username, a.email, a.role FROM sessions s JOIN accounts a ON a.id = s.account_id WHERE s.token = ?",
      [token]
    );
  }

  async guard(request, roles) {
    const account = await this.accountFromRequest(request);
    if (!account) return { response: json({ ok: false, error: "Sign in required." }, 401) };
    if (roles && !roles.includes(account.role)) {
      const label = roles.includes("admin") && !roles.includes("staff") ? "Admin" : "Staff";
      return { response: json({ ok: false, error: label + " access required." }, 403) };
    }
    return { account };
  }

  validateRegistration(body) {
    const username = clean(body.username).toLowerCase();
    if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
      return { error: "Username must be 3-40 characters using a-z, 0-9, dot, underscore, or hyphen." };
    }
    const email = clean(body.email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "A valid email address is required." };
    }
    if (typeof body.password !== "string" || body.password.length < 8) {
      return { error: "Password must be at least 8 characters." };
    }
    return { username, email, password: body.password };
  }

  duplicateAccountError(username, email) {
    const dup = this.one("SELECT id FROM accounts WHERE username = ? OR email = ?", [username, email]);
    if (!dup) return null;
    return json({ ok: false, error: "That username or email is already registered." }, 400);
  }

  async handleRegister(request) {
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;
    const checked = this.validateRegistration(body);
    if (checked.error) return json({ ok: false, error: checked.error }, 400);
    const { username, email, password } = checked;
    const dup = this.duplicateAccountError(username, email);
    if (dup) return dup;
    // Username "admin" is only promoted when this is the very first account.
    const accountsCount = this.one("SELECT COUNT(*) AS n FROM accounts").n;
    const role = username === "admin" && accountsCount === 0 ? "admin" : "guest";
    const account = await this.createAccount(username, email, password, role);
    const token = this.createSession(account.id);
    return json({ ok: true, account }, 200, sessionCookieHeaders(token));
  }

  async handleLogin(request) {
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;
    const username = clean(body.username).toLowerCase();
    const password = typeof body.password === "string" ? body.password : "";
    const account = this.one("SELECT * FROM accounts WHERE username = ?", [username]);
    // Hash either way so a missing account costs the same work as a wrong password.
    const salt = account ? account.password_salt : randomHex(16);
    const hash = await hashPassword(salt, password);
    if (!account || !constantTimeEqual(hash, account.password_hash)) {
      return json({ ok: false, error: "Wrong username or password." }, 401);
    }
    const token = this.createSession(account.id);
    return json({ ok: true, account: this.accountJson(account) }, 200, sessionCookieHeaders(token));
  }

  handleLogout(request) {
    const token = readSessionToken(request);
    if (token) this.sql.exec("DELETE FROM sessions WHERE token = ?", token);
    return json({ ok: true }, 200, clearedSessionCookieHeaders());
  }

  async handleMe(request) {
    const account = await this.accountFromRequest(request);
    if (!account) return json({ ok: false, error: "Sign in required." }, 401);
    return json({ ok: true, account: this.accountJson(account) });
  }

  // ---- Menu ---------------------------------------------------------------

  itemJson(row) {
    return {
      id: row.id,
      categoryId: row.category_id,
      name: row.name,
      description: row.description,
      price: row.price,
      available: row.available,
      sort: row.sort,
      photoKey: row.photo_key,
      photoUrl: mediaUrl(row.photo_key),
    };
  }

  settingsJson() {
    const row = this.one("SELECT tax_bps, delivery_enabled, ordering_open FROM settings WHERE id = 1");
    return { taxBps: row.tax_bps, deliveryEnabled: row.delivery_enabled, orderingOpen: row.ordering_open };
  }

  handleMenu() {
    const categories = this
      .all("SELECT id, name, sort FROM categories WHERE active = 1 ORDER BY sort ASC, id ASC")
      .map((row) => ({ id: row.id, name: row.name, sort: row.sort }));
    const items = this
      .all(
        "SELECT id, category_id, name, description, price, available, sort, photo_key FROM items WHERE active = 1 ORDER BY sort ASC, id ASC"
      )
      .map((row) => this.itemJson(row));
    return json({ ok: true, prototype: true, categories, items, settings: this.settingsJson() });
  }

  // ---- Orders ---------------------------------------------------------------

  orderJson(row) {
    const lines = this.all(
      "SELECT id, item_id, name, qty, note, unit_price, line_total FROM order_lines WHERE order_id = ? ORDER BY rowid ASC",
      [row.id]
    );
    return {
      id: row.id,
      name: row.name,
      phone: row.phone,
      service: row.service,
      table: row.table_no,
      address: row.address,
      note: row.note,
      status: row.status,
      subtotal: row.subtotal,
      tax: row.tax,
      total: row.total,
      taxBps: row.tax_bps,
      placedAt: row.placed_at,
      acceptedAt: row.accepted_at,
      readyAt: row.ready_at,
      completedAt: row.completed_at,
      lines: lines.map((line) => ({
        id: line.id,
        itemId: line.item_id,
        name: line.name,
        qty: line.qty,
        note: line.note,
        unitPrice: line.unit_price,
        lineTotal: line.line_total,
      })),
    };
  }

  orderJsonById(id) {
    const row = this.one("SELECT * FROM orders WHERE id = ?", [id]);
    return row ? this.orderJson(row) : null;
  }

  // One function serves POST /api/order and POST /api/staff/order.
  // The staff route (staffOrAdmin) may run while ordering is closed.
  async handleOrderPost(request, staffOrAdmin) {
    if (staffOrAdmin) {
      const gate = await this.guard(request, ["staff", "admin"]);
      if (gate.response) return gate.response;
    }
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const key = clean(body.key);
    if (!key) return json({ ok: false, error: "An idempotency key is required." }, 400);
    if (key.length > 80) return json({ ok: false, error: "The idempotency key is too long." }, 400);

    const existing = this.one("SELECT * FROM orders WHERE idempotency_key = ?", [key]);
    if (existing) return json({ ok: true, order: this.orderJson(existing), repeat: true });

    const service = clean(body.service);
    if (!SERVICES.includes(service)) {
      return json({ ok: false, error: "Service must be dine_in, takeaway, or delivery." }, 400);
    }

    const name = clean(body.name);
    if (!name) return json({ ok: false, error: "A name is required." }, 400);
    if (name.length > 80) return json({ ok: false, error: "The name is too long." }, 400);
    const phone = clean(body.phone);
    if (!phone) return json({ ok: false, error: "A phone number is required." }, 400);
    if (phone.length > 20) return json({ ok: false, error: "The phone number is too long." }, 400);

    const settings = this.one("SELECT tax_bps, delivery_enabled, ordering_open FROM settings WHERE id = 1");

    if (!staffOrAdmin && settings.ordering_open === 0) {
      return json({ ok: false, error: "Ordering is closed." }, 400);
    }

    const table = clean(body.table);
    const address = clean(body.address);
    const note = clean(body.note);

    if (service === "delivery") {
      if (settings.delivery_enabled === 0) {
        return json({ ok: false, error: "Delivery is not offered." }, 400);
      }
      if (!address) return json({ ok: false, error: "A delivery address is required." }, 400);
    }

    const rawLines = Array.isArray(body.lines) ? body.lines : [];
    if (rawLines.length === 0) return json({ ok: false, error: "At least one line is required." }, 400);

    const lines = [];
    for (const raw of rawLines) {
      const itemId = clean(raw && raw.itemId);
      if (!itemId) return json({ ok: false, error: "Every line needs an itemId." }, 400);
      const qty = raw ? raw.qty : undefined;
      if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
        return json({ ok: false, error: "Quantity must be an integer from 1 to 20." }, 400);
      }
      const item = this.one(
        "SELECT id, name, price FROM items WHERE id = ? AND active = 1 AND available = 1",
        [itemId]
      );
      if (!item) {
        const known = this.one("SELECT name FROM items WHERE id = ?", [itemId]);
        const label = known ? known.name : itemId;
        return json({ ok: false, error: '"' + label + '" is not available.' }, 400);
      }
      lines.push({ item, qty, note: clean(raw.note) });
    }

    const subtotal = lines.reduce((sum, line) => sum + line.item.price * line.qty, 0);
    const tax = Math.round((subtotal * settings.tax_bps) / 10000);
    const total = subtotal + tax;

    const id = "OR-" + Date.now().toString(36).toUpperCase();
    this.sql.exec(
      `INSERT INTO orders (id, name, phone, service, table_no, address, note, status, subtotal, tax, total, tax_bps, placed_at, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'placed', ?, ?, ?, ?, ?, ?)`,
      id,
      name,
      phone,
      service,
      table,
      address,
      note,
      subtotal,
      tax,
      total,
      settings.tax_bps,
      Date.now(),
      key
    );
    for (const line of lines) {
      this.sql.exec(
        "INSERT INTO order_lines (id, order_id, item_id, name, qty, note, unit_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        randomHex(8),
        id,
        line.item.id,
        line.item.name,
        line.qty,
        line.note,
        line.item.price,
        line.item.price * line.qty
      );
    }

    return json({ ok: true, order: this.orderJsonById(id) });
  }

  async handleStaffOrdersList(request) {
    const gate = await this.guard(request, ["staff", "admin"]);
    if (gate.response) return gate.response;

    const today = kolkataToday();
    const rawDay = clean(new URL(request.url).searchParams.get("day"));
    const day = isDayShape(rawDay) ? rawDay : today;
    const start = kolkataDayStart(day);
    const end = start + 24 * 60 * 60 * 1000;
    const now = Date.now();

    const active = this
      .all("SELECT * FROM orders WHERE status IN ('placed', 'accepted', 'ready') ORDER BY placed_at ASC")
      .map((row) => {
        const order = this.orderJson(row);
        order.waitingSeconds = Math.floor((now - row.placed_at) / 1000);
        return order;
      });

    const completed = this
      .all(
        "SELECT * FROM orders WHERE status = 'completed' AND completed_at >= ? AND completed_at < ? ORDER BY completed_at ASC",
        [start, end]
      )
      .map((row) => {
        const order = this.orderJson(row);
        order.waitSeconds = Math.floor((row.completed_at - row.placed_at) / 1000);
        return order;
      });

    const averageWaitMinutes =
      completed.length === 0
        ? null
        : Math.round((completed.reduce((sum, order) => sum + order.waitSeconds, 0) / completed.length / 60) * 10) / 10;

    return json({ ok: true, today: day, active, completed, averageWaitMinutes });
  }

  async handleStaffOrderGet(request) {
    const gate = await this.guard(request, ["staff", "admin"]);
    if (gate.response) return gate.response;
    const id = clean(new URL(request.url).searchParams.get("id"));
    if (!id) return json({ ok: false, error: "An order id is required." }, 400);
    const order = this.orderJsonById(id);
    if (!order) return json({ ok: false, error: "Order not found." }, 404);
    return json({ ok: true, order });
  }

  async handleStaffStatus(request) {
    const gate = await this.guard(request, ["staff", "admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const id = clean(body.id);
    if (!id) return json({ ok: false, error: "An order id is required." }, 400);
    const status = clean(body.status);
    if (!SETTABLE_STATUSES.includes(status)) {
      return json({ ok: false, error: "Status must be accepted, ready, completed, or cancelled." }, 400);
    }

    const row = this.one("SELECT * FROM orders WHERE id = ?", [id]);
    if (!row) return json({ ok: false, error: "Order not found." }, 404);

    const allowed = NEXT_STATUSES[row.status] || [];
    if (!allowed.includes(status)) {
      return json({ ok: false, error: "An order that is " + row.status + " cannot move to " + status + "." }, 400);
    }

    const column = STATUS_TIMESTAMP_COLUMN[status];
    if (column) {
      this.sql.exec("UPDATE orders SET status = ?, " + column + " = ? WHERE id = ?", status, Date.now(), id);
    } else {
      this.sql.exec("UPDATE orders SET status = ? WHERE id = ?", status, id);
    }
    return json({ ok: true, order: this.orderJsonById(id) });
  }

  // ---- Admin ----------------------------------------------------------------

  async handleAdminMenu(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const categories = this
      .all("SELECT id, name, sort, active FROM categories ORDER BY sort ASC, id ASC")
      .map((row) => ({ id: row.id, name: row.name, sort: row.sort, active: row.active }));
    const items = this
      .all("SELECT id, category_id, name, description, price, available, sort, photo_key, active FROM items ORDER BY sort ASC, id ASC")
      .map((row) => ({ ...this.itemJson(row), active: row.active }));
    return json({ ok: true, categories, items, settings: this.settingsJson() });
  }

  async handleAdminCategory(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    if (body.remove === true) {
      const id = clean(body.id);
      if (!id) return json({ ok: false, error: "A category id is required." }, 400);
      const row = this.one("SELECT id FROM categories WHERE id = ?", [id]);
      if (!row) return json({ ok: false, error: "Category not found." }, 404);
      this.sql.exec("UPDATE categories SET active = 0 WHERE id = ?", id);
      return json({ ok: true });
    }

    const name = clean(body.name);
    if (!name) return json({ ok: false, error: "A category name is required." }, 400);
    const sort = body.sort === undefined ? 0 : body.sort;
    if (!Number.isInteger(sort)) return json({ ok: false, error: "sort must be an integer." }, 400);

    const id = clean(body.id);
    if (!id) {
      const newId = randomHex(8);
      this.sql.exec("INSERT INTO categories (id, name, sort, active) VALUES (?, ?, ?, 1)", newId, name, sort);
      return json({ ok: true, id: newId });
    }
    const row = this.one("SELECT id FROM categories WHERE id = ?", [id]);
    if (!row) return json({ ok: false, error: "Category not found." }, 404);
    this.sql.exec("UPDATE categories SET name = ?, sort = ? WHERE id = ?", name, sort, id);
    return json({ ok: true });
  }

  async handleAdminItem(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    if (body.remove === true) {
      const removeId = clean(body.id);
      if (!removeId) return json({ ok: false, error: "An item id is required." }, 400);
      const removeRow = this.one("SELECT id FROM items WHERE id = ?", [removeId]);
      if (!removeRow) return json({ ok: false, error: "Item not found." }, 404);
      this.sql.exec("UPDATE items SET active = 0 WHERE id = ?", removeId);
      return json({ ok: true });
    }

    const id = clean(body.id);
    const existing = id ? this.one("SELECT id FROM items WHERE id = ?", [id]) : null;
    if (id && !existing) return json({ ok: false, error: "Item not found." }, 404);
    const isCreate = !id;

    const fields = {};

    if (body.name !== undefined || isCreate) {
      const name = clean(body.name);
      if (!name) return json({ ok: false, error: "An item name is required." }, 400);
      fields.name = name;
    }
    if (body.categoryId !== undefined || isCreate) {
      const categoryId = clean(body.categoryId);
      if (!categoryId) return json({ ok: false, error: "A categoryId is required." }, 400);
      const category = this.one("SELECT id FROM categories WHERE id = ?", [categoryId]);
      if (!category) return json({ ok: false, error: "Category not found." }, 404);
      fields.category_id = categoryId;
    }
    if (body.description !== undefined || isCreate) {
      fields.description = clean(body.description);
    }
    if (body.price !== undefined || isCreate) {
      const rupees = body.price;
      if (typeof rupees !== "number" || !Number.isFinite(rupees) || rupees < 1) {
        return json({ ok: false, error: "Price must be at least 1 rupee." }, 400);
      }
      fields.price = Math.round(rupees * 100);
    }
    if (body.available !== undefined || isCreate) {
      const available = body.available === undefined ? 1 : body.available;
      if (available !== 0 && available !== 1) {
        return json({ ok: false, error: "available must be 0 or 1." }, 400);
      }
      fields.available = available;
    }
    if (body.sort !== undefined || isCreate) {
      const sort = body.sort === undefined ? 0 : body.sort;
      if (!Number.isInteger(sort)) return json({ ok: false, error: "sort must be an integer." }, 400);
      fields.sort = sort;
    }

    if (isCreate) {
      fields.id = randomHex(8);
      fields.active = 1;
      const columns = Object.keys(fields);
      this.sql.exec(
        "INSERT INTO items (" + columns.join(", ") + ") VALUES (" + columns.map(() => "?").join(", ") + ")",
        ...columns.map((column) => fields[column])
      );
      return json({ ok: true, id: fields.id });
    }

    const columns = Object.keys(fields);
    if (columns.length > 0) {
      this.sql.exec(
        "UPDATE items SET " + columns.map((column) => column + " = ?").join(", ") + " WHERE id = ?",
        ...columns.map((column) => fields[column]),
        id
      );
    }
    return json({ ok: true });
  }

  async handleAdminPhoto(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const itemId = clean(body.itemId);
    if (!itemId) return json({ ok: false, error: "An itemId is required." }, 400);
    const item = this.one("SELECT id FROM items WHERE id = ?", [itemId]);
    if (!item) return json({ ok: false, error: "Item not found." }, 404);

    const mime = clean(body.mime);
    const extension = PHOTO_EXTENSIONS[mime];
    if (!extension) {
      return json({ ok: false, error: "mime must be image/jpeg, image/png, or image/webp." }, 400);
    }

    const dataBase64 = typeof body.dataBase64 === "string" ? body.dataBase64 : "";
    if (!dataBase64) return json({ ok: false, error: "dataBase64 is required." }, 400);
    if (dataBase64.length > PHOTO_MAX_BASE64_LENGTH) {
      return json({ ok: false, error: "The photo is too large." }, 400);
    }

    let bytes;
    try {
      const binary = atob(dataBase64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    } catch {
      return json({ ok: false, error: "dataBase64 is not valid base64." }, 400);
    }

    if (!this.env || !this.env.MEDIA) {
      return json({ ok: false, error: "Media storage is not configured." }, 500);
    }

    const photoKey = "items/" + itemId + "/" + randomHex(8) + "." + extension;
    await this.env.MEDIA.put(photoKey, bytes, { httpMetadata: { contentType: mime } });
    this.sql.exec("UPDATE items SET photo_key = ? WHERE id = ?", photoKey, itemId);
    return json({ ok: true, photoKey, photoUrl: mediaUrl(photoKey) });
  }

  async handleAdminSettings(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const sets = [];
    const params = [];
    if (body.taxBps !== undefined) {
      if (!Number.isInteger(body.taxBps) || body.taxBps < 0 || body.taxBps > 10000) {
        return json({ ok: false, error: "taxBps must be an integer from 0 to 10000." }, 400);
      }
      sets.push("tax_bps = ?");
      params.push(body.taxBps);
    }
    if (body.deliveryEnabled !== undefined) {
      if (body.deliveryEnabled !== 0 && body.deliveryEnabled !== 1) {
        return json({ ok: false, error: "deliveryEnabled must be 0 or 1." }, 400);
      }
      sets.push("delivery_enabled = ?");
      params.push(body.deliveryEnabled);
    }
    if (body.orderingOpen !== undefined) {
      if (body.orderingOpen !== 0 && body.orderingOpen !== 1) {
        return json({ ok: false, error: "orderingOpen must be 0 or 1." }, 400);
      }
      sets.push("ordering_open = ?");
      params.push(body.orderingOpen);
    }
    if (sets.length > 0) {
      this.sql.exec("UPDATE settings SET " + sets.join(", ") + " WHERE id = 1", ...params);
    }
    return json({ ok: true, settings: this.settingsJson() });
  }

  async handleAdminAccountsList(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const accounts = this
      .all("SELECT id, username, email, role FROM accounts ORDER BY created_at ASC, username ASC")
      .map((row) => this.accountJson(row));
    return json({ ok: true, accounts });
  }

  async handleAdminAccountCreate(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const role = clean(body.role);
    if (role !== "staff" && role !== "admin") {
      return json({ ok: false, error: "Role must be staff or admin." }, 400);
    }
    const checked = this.validateRegistration(body);
    if (checked.error) return json({ ok: false, error: checked.error }, 400);
    const dup = this.duplicateAccountError(checked.username, checked.email);
    if (dup) return dup;
    const account = await this.createAccount(checked.username, checked.email, checked.password, role);
    return json({ ok: true, account });
  }

  async handleAdminRole(request) {
    const gate = await this.guard(request, ["admin"]);
    if (gate.response) return gate.response;
    const body = await this.readBody(request);
    const bad = this.bodyError(body);
    if (bad) return bad;

    const id = clean(body.id);
    if (!id) return json({ ok: false, error: "An account id is required." }, 400);
    const role = clean(body.role);
    if (!["guest", "staff", "admin"].includes(role)) {
      return json({ ok: false, error: "Role must be guest, staff, or admin." }, 400);
    }

    const row = this.one("SELECT * FROM accounts WHERE id = ?", [id]);
    if (!row) return json({ ok: false, error: "Account not found." }, 404);

    if (row.role === "admin" && role !== "admin") {
      const admins = this.one("SELECT COUNT(*) AS n FROM accounts WHERE role = 'admin'").n;
      if (admins <= 1) {
        return json({ ok: false, error: "The last administrator cannot be demoted." }, 400);
      }
    }

    this.sql.exec("UPDATE accounts SET role = ? WHERE id = ?", role, id);
    return json({ ok: true, account: { id: row.id, username: row.username, email: row.email, role } });
  }
}
