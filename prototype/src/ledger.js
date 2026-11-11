const TYPES = [
  {
    id: "garden",
    name: "Garden room",
    count: 4,
    price: 250000,
    guests: 2,
    summary: "A quiet room opening onto the garden. Fan, attached bath, morning tea.",
  },
  {
    id: "courtyard",
    name: "Courtyard room",
    count: 4,
    price: 350000,
    guests: 2,
    summary: "Faces the inner courtyard. Attached bath, writing table, evening lamp.",
  },
  {
    id: "ashram",
    name: "Ashram suite",
    count: 2,
    price: 550000,
    guests: 3,
    summary: "A larger room for a longer stay. Sitting area, attached bath, garden view.",
  },
];

const DAY = 86400000;

const PAYMENT_METHODS = new Set(["upi", "indian_card", "international_card", "pay_at_desk"]);
const CARD_METHODS = new Set(["indian_card", "international_card"]);

const ROOMS = [
  ["G1", "garden", "Garden 1"],
  ["G2", "garden", "Garden 2"],
  ["G3", "garden", "Garden 3"],
  ["G4", "garden", "Garden 4"],
  ["C1", "courtyard", "Courtyard 1"],
  ["C2", "courtyard", "Courtyard 2"],
  ["C3", "courtyard", "Courtyard 3"],
  ["C4", "courtyard", "Courtyard 4"],
  ["A1", "ashram", "Ashram 1"],
  ["A2", "ashram", "Ashram 2"],
];

export class Ledger {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.ready = state.blockConcurrencyWhile(() => this.migrate());
  }

  async migrate() {
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS room_types (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        summary TEXT NOT NULL,
        guests INTEGER NOT NULL,
        count INTEGER NOT NULL,
        price INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS range_prices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_id TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        price INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bookings (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        check_in TEXT NOT NULL,
        check_out TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT NOT NULL,
        nights INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        status TEXT NOT NULL,
        payment_id TEXT,
        idempotency_key TEXT UNIQUE,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS blocks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_id TEXT NOT NULL,
        start TEXT NOT NULL,
        end TEXT NOT NULL,
        reason TEXT NOT NULL
      );
    `);
    this.state.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        type_id TEXT NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS persons (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        address TEXT NOT NULL DEFAULT '',
        notes TEXT NOT NULL DEFAULT '',
        payment_method TEXT,
        card_last4 TEXT,
        card_network TEXT,
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS occupants (
        id TEXT PRIMARY KEY,
        booking_id TEXT NOT NULL,
        person_id TEXT,
        name TEXT NOT NULL,
        is_payer INTEGER NOT NULL DEFAULT 0,
        nationality TEXT,
        passport_no TEXT,
        id_mime TEXT,
        id_filename TEXT,
        id_blob TEXT
      );
    `);
    for (const [col, decl] of [
      ["person_id", "TEXT"],
      ["room_id", "TEXT"],
      ["address", "TEXT"],
      ["payment_method", "TEXT"],
      ["card_last4", "TEXT"],
      ["card_network", "TEXT"],
    ]) {
      try {
        this.state.storage.sql.exec(`ALTER TABLE bookings ADD COLUMN ${col} ${decl}`);
      } catch (e) {
        if (!/duplicate column/i.test(String((e && e.message) || e))) throw e;
      }
    }
    for (const t of TYPES) {
      this.state.storage.sql.exec(
        `INSERT INTO room_types (id, name, summary, guests, count, price)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        t.id, t.name, t.summary, t.guests, t.count, t.price,
      );
    }
    for (const [id, typeId, name] of ROOMS) {
      this.state.storage.sql.exec(
        `INSERT INTO rooms (id, type_id, name) VALUES (?, ?, ?)
         ON CONFLICT(id) DO NOTHING`,
        id, typeId, name,
      );
    }
    this.backfillBookings();
  }

  backfillBookings() {
    const legacy = this.state.storage.sql.exec(
      `SELECT * FROM bookings WHERE person_id IS NULL ORDER BY created_at, id`,
    ).toArray();
    for (const b of legacy) {
      const personId = crypto.randomUUID();
      this.state.storage.sql.exec(
        `INSERT INTO persons (id, name, phone, email, address, notes, created_at)
         VALUES (?, ?, ?, ?, '', '', ?)`,
        personId, b.name, b.phone, b.email, Date.now(),
      );
      const roomId = this.firstFreeRoom(b.type_id, b.check_in, b.check_out);
      this.state.storage.sql.exec(
        `UPDATE bookings SET person_id = ?, room_id = ? WHERE id = ?`,
        personId, roomId, b.id,
      );
    }
  }

  firstFreeRoom(typeId, start, end) {
    const rooms = this.state.storage.sql.exec(
      `SELECT id FROM rooms WHERE type_id = ? ORDER BY id`, typeId,
    ).toArray();
    const busy = new Set(this.state.storage.sql.exec(
      `SELECT DISTINCT room_id FROM bookings
       WHERE status = 'confirmed' AND room_id IS NOT NULL
         AND check_in < ? AND check_out > ?`,
      end, start,
    ).toArray().map((r) => r.room_id));
    const room = rooms.find((r) => !busy.has(r.id));
    return room ? room.id : null;
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/availability") {
      return json(this.availability(url.searchParams.get("from"), url.searchParams.get("to")));
    }
    if (request.method === "GET" && url.pathname === "/api/desk") {
      return json(this.deskDay(url.searchParams.get("date")));
    }
    if (request.method === "GET" && url.pathname === "/api/stay") {
      return json(this.stay(url.searchParams.get("id")));
    }
    if (request.method === "GET" && url.pathname === "/api/id") {
      return this.idImage(url.searchParams.get("occupant"));
    }
    if (request.method === "GET" && url.pathname === "/api/search") {
      return json(this.search(url.searchParams.get("q")));
    }
    if (request.method === "POST" && url.pathname === "/api/book") {
      const body = await request.json();
      return json(this.book(body));
    }
    if (request.method === "POST" && url.pathname === "/api/block") {
      const body = await request.json();
      return json(this.block(body));
    }
    if (request.method === "POST" && url.pathname === "/api/price") {
      const body = await request.json();
      return json(this.setPrice(body));
    }
    if (request.method === "POST" && url.pathname === "/api/stay") {
      const body = await request.json();
      return json(this.stayUpdate(body));
    }
    if (request.method === "POST" && url.pathname === "/api/move") {
      const body = await request.json();
      return json(this.move(body));
    }
    if (request.method === "POST" && url.pathname === "/api/occupant-id") {
      const body = await request.json();
      return json(this.setOccupantId(body));
    }
    return new Response("Not found", { status: 404 });
  }

  types() {
    return this.state.storage.sql.exec(`SELECT * FROM room_types ORDER BY price`).toArray();
  }

  availability(from, to) {
    const start = from && iso(from) ? from : today();
    const end = to && iso(to) && to > start ? to : addDays(start, 14);
    const types = this.types().map((t) => {
      const free = this.freeRooms(t.id, start, end);
      const price = this.priceFor(t, start, end);
      return {
        id: t.id,
        name: t.name,
        summary: t.summary,
        guests: t.guests,
        total: t.count,
        free: Math.max(0, free),
        nightly: price,
        nights: nightsBetween(start, end),
        totalPrice: price * nightsBetween(start, end),
      };
    });
    return { from: start, to: end, types, prototype: true };
  }

  taken(typeId, start, end) {
    const booked = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE type_id = ? AND status = 'confirmed'
         AND check_in < ? AND check_out > ?`,
      typeId, end, start,
    ).one().n;
    const blocked = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM blocks
       WHERE type_id = ? AND start < ? AND end > ?`,
      typeId, end, start,
    ).one().n;
    return booked + blocked;
  }

  // Free rooms per type: physical rooms minus overlapping stays and blocks
  // (each block row still consumes exactly one unit of its type).
  freeRooms(typeId, start, end) {
    const total = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM rooms WHERE type_id = ?`, typeId,
    ).one().n;
    return total - this.taken(typeId, start, end);
  }

  pickRoom(typeId, start, end) {
    const rooms = this.state.storage.sql.exec(
      `SELECT id FROM rooms WHERE type_id = ? ORDER BY id`, typeId,
    ).toArray();
    if (!rooms.length) return null;
    const busy = new Set(this.state.storage.sql.exec(
      `SELECT DISTINCT room_id FROM bookings
       WHERE status = 'confirmed' AND type_id = ? AND room_id IS NOT NULL
         AND check_in < ? AND check_out > ?`,
      typeId, end, start,
    ).toArray().map((r) => r.room_id));
    const floating = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE status = 'confirmed' AND type_id = ? AND room_id IS NULL
         AND check_in < ? AND check_out > ?`,
      typeId, end, start,
    ).one().n;
    const blocks = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM blocks WHERE type_id = ? AND start < ? AND end > ?`,
      typeId, end, start,
    ).one().n;
    const free = rooms.filter((r) => !busy.has(r.id));
    if (free.length - floating - blocks <= 0) return null;
    return free[0].id;
  }

  insertOccupant(bookingId, personId, name, isPayer, nationality, passportNo, doc) {
    const id = crypto.randomUUID();
    this.state.storage.sql.exec(
      `INSERT INTO occupants
        (id, booking_id, person_id, name, is_payer, nationality, passport_no, id_mime, id_filename, id_blob)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, bookingId, personId, name, isPayer, nationality, passportNo,
      doc ? doc.mime : null, doc ? doc.filename : null, doc ? doc.blob : null,
    );
    return id;
  }

  priceFor(type, start, end) {
    const row = this.state.storage.sql.exec(
      `SELECT price FROM range_prices
       WHERE type_id = ? AND start <= ? AND end >= ?
       ORDER BY id DESC LIMIT 1`,
      type.id, start, end,
    ).toArray()[0];
    return row ? row.price : type.price;
  }

  book(body) {
    const key = String(body.key || "").slice(0, 80);
    if (!key) return { ok: false, error: "Missing booking key." };
    const existing = this.state.storage.sql.exec(
      `SELECT * FROM bookings WHERE idempotency_key = ?`, key,
    ).toArray()[0];
    if (existing) return { ok: true, booking: publicBooking(existing), repeat: true };

    const type = this.types().find((t) => t.id === body.typeId);
    if (!type) return { ok: false, error: "Unknown room type." };
    const checkIn = body.checkIn;
    const checkOut = body.checkOut;
    if (!iso(checkIn) || !iso(checkOut) || checkOut <= checkIn) {
      return { ok: false, error: "Choose a check-in and a later check-out." };
    }
    const name = clean(body.name, 80);
    const email = clean(body.email, 120);
    const phone = clean(body.phone, 30);
    if (!name || !email || !phone) return { ok: false, error: "Name, email, and mobile are required." };
    const address = clean(body.address, 200);
    const asked = clean(body.paymentMethod, 30);
    const paymentMethod = asked ? (PAYMENT_METHODS.has(asked) ? asked : null) : "pay_at_desk";
    if (!paymentMethod) {
      return { ok: false, error: "Payment method must be upi, indian_card, international_card, or pay_at_desk." };
    }
    // Only cardLast4 (exactly four digits) and cardNetwork are ever read;
    // any full-card-number field in the body is ignored, never stored.
    let cardLast4 = null;
    let cardNetwork = null;
    if (CARD_METHODS.has(paymentMethod)) {
      const digits = typeof body.cardLast4 === "string" ? body.cardLast4.trim() : "";
      if (!/^\d{4}$/.test(digits)) {
        return { ok: false, error: "A card stay needs the last four digits of the card." };
      }
      cardLast4 = digits;
      cardNetwork = clean(body.cardNetwork, 24) || null;
      if (cardNetwork && /\d{8,}/.test(cardNetwork)) cardNetwork = null;
    }
    const list = Array.isArray(body.occupants) ? body.occupants : [];
    if (!list.length) return { ok: false, error: "Add the paying guest as the first occupant." };
    if (list.length > 16) return { ok: false, error: "Too many occupants for one stay." };
    const payer = list[0] && typeof list[0] === "object" ? list[0] : {};
    const payerName = clean(payer.name, 80) || name;
    const payerDoc = parseIdDoc(payer, "The paying guest");
    if (!payerDoc.ok) return { ok: false, error: payerDoc.error };
    const others = [];
    for (let i = 1; i < list.length; i++) {
      const o = list[i] && typeof list[i] === "object" ? list[i] : {};
      const oName = clean(o.name, 80);
      if (!oName) return { ok: false, error: "Every other occupant needs a name." };
      let doc = null;
      if (o.filename !== undefined || o.mime !== undefined || o.dataBase64 !== undefined) {
        doc = parseIdDoc(o, "That occupant");
        if (!doc.ok) return { ok: false, error: doc.error };
      }
      others.push({
        name: oName,
        nationality: clean(o.nationality, 60) || null,
        passportNo: clean(o.passportNo, 40) || null,
        doc,
      });
    }
    const roomId = this.pickRoom(type.id, checkIn, checkOut);
    if (!roomId) {
      return { ok: false, error: "That room was just taken for those nights. Nothing was charged." };
    }
    const n = nightsBetween(checkIn, checkOut);
    const amount = this.priceFor(type, checkIn, checkOut) * n;
    const id = "AD-" + Date.now().toString(36).toUpperCase();
    const personId = crypto.randomUUID();
    const now = Date.now();
    this.state.storage.sql.exec(
      `INSERT INTO persons
        (id, name, phone, email, address, notes, payment_method, card_last4, card_network, created_at)
       VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?)`,
      personId, name, phone, email, address, paymentMethod, cardLast4, cardNetwork, now,
    );
    this.state.storage.sql.exec(
      `INSERT INTO bookings
        (id, type_id, check_in, check_out, name, email, phone, nights, amount, status, payment_id,
         idempotency_key, created_at, person_id, room_id, address, payment_method, card_last4, card_network)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, type.id, checkIn, checkOut, name, email, phone, n, amount,
      "prototype-" + key, key, now, personId, roomId, address, paymentMethod, cardLast4, cardNetwork,
    );
    this.insertOccupant(id, personId, payerName, 1,
      clean(payer.nationality, 60) || null, clean(payer.passportNo, 40) || null, payerDoc);
    for (const o of others) {
      this.insertOccupant(id, null, o.name, 0, o.nationality, o.passportNo, o.doc);
    }
    const booking = this.state.storage.sql.exec(`SELECT * FROM bookings WHERE id = ?`, id).one();
    return { ok: true, booking: publicBooking(booking), repeat: false };
  }

  block(body) {
    const type = this.types().find((t) => t.id === body.typeId);
    if (!type) return { ok: false, error: "Unknown room type." };
    if (!iso(body.start) || !iso(body.end) || body.end <= body.start) {
      return { ok: false, error: "Choose a start and a later end." };
    }
    const reason = clean(body.reason, 140) || "Blocked";
    this.state.storage.sql.exec(
      `INSERT INTO blocks (type_id, start, end, reason) VALUES (?, ?, ?, ?)`,
      type.id, body.start, body.end, reason,
    );
    return { ok: true, desk: this.desk() };
  }

  setPrice(body) {
    const type = this.types().find((t) => t.id === body.typeId);
    if (!type) return { ok: false, error: "Unknown room type." };
    const price = Math.round(Number(body.price));
    if (!price || price < 100) return { ok: false, error: "Enter a nightly price in rupees." };
    const paise = price * 100;
    if (body.start && body.end) {
      if (!iso(body.start) || !iso(body.end) || body.end <= body.start) {
        return { ok: false, error: "Choose a start and a later end." };
      }
      this.state.storage.sql.exec(
        `INSERT INTO range_prices (type_id, start, end, price) VALUES (?, ?, ?, ?)`,
        type.id, body.start, body.end, paise,
      );
    } else {
      this.state.storage.sql.exec(`UPDATE room_types SET price = ? WHERE id = ?`, paise, type.id);
    }
    return { ok: true, desk: this.desk() };
  }

  desk() {
    const bookings = this.state.storage.sql.exec(
      `SELECT * FROM bookings ORDER BY check_in, created_at DESC`,
    ).toArray().map(publicBooking);
    const blocks = this.state.storage.sql.exec(`SELECT * FROM blocks ORDER BY start`).toArray();
    return { types: this.types().map(publicType), bookings, blocks };
  }

  deskDay(dateParam) {
    const date = iso(dateParam) ? dateParam : today();
    const confirmed = this.state.storage.sql.exec(
      `SELECT * FROM bookings WHERE status = 'confirmed' ORDER BY check_in, created_at DESC`,
    ).toArray();
    const arriving = confirmed.filter((b) => b.check_in === date).map((b) => this.staySummary(b));
    const departing = confirmed.filter((b) => b.check_out === date).map((b) => this.staySummary(b));
    const inHouse = confirmed
      .filter((b) => b.check_in <= date && b.check_out > date)
      .map((b) => this.staySummary(b));
    const rooms = this.state.storage.sql.exec(`SELECT * FROM rooms ORDER BY id`).toArray().map((r) => {
      const stay = confirmed.find(
        (b) => b.room_id === r.id && b.check_in <= date && b.check_out > date,
      );
      if (stay) {
        return { id: r.id, typeId: r.type_id, name: r.name, status: "occupied", stay: this.staySummary(stay) };
      }
      const block = this.state.storage.sql.exec(
        `SELECT reason FROM blocks WHERE type_id = ? AND start <= ? AND end > ? ORDER BY id DESC LIMIT 1`,
        r.type_id, date, date,
      ).toArray()[0];
      if (block) {
        return { id: r.id, typeId: r.type_id, name: r.name, status: "blocked", reason: block.reason };
      }
      return { id: r.id, typeId: r.type_id, name: r.name, status: "empty" };
    });
    return { date, types: this.types().map(publicType), arriving, departing, inHouse, rooms };
  }

  staySummary(b) {
    const person = b.person_id
      ? this.state.storage.sql.exec(`SELECT * FROM persons WHERE id = ?`, b.person_id).toArray()[0]
      : null;
    return {
      id: b.id,
      name: (person && person.name) || b.name,
      phone: (person && person.phone) || b.phone,
      roomId: b.room_id || null,
      typeId: b.type_id,
      checkIn: b.check_in,
      checkOut: b.check_out,
      amount: b.amount,
      paymentMethod: b.payment_method || (person && person.payment_method) || null,
      cardLast4: b.card_last4 || (person && person.card_last4) || null,
    };
  }

  bookingById(id) {
    const bookingId = clean(id, 40);
    if (!bookingId) return null;
    return this.state.storage.sql.exec(
      `SELECT * FROM bookings WHERE id = ?`, bookingId,
    ).toArray()[0] || null;
  }

  stay(id) {
    const booking = this.bookingById(id);
    if (!booking) return { ok: false, error: "No stay with that id." };
    const person = booking.person_id
      ? this.state.storage.sql.exec(`SELECT * FROM persons WHERE id = ?`, booking.person_id).toArray()[0]
      : null;
    const occupants = this.state.storage.sql.exec(
      `SELECT * FROM occupants WHERE booking_id = ? ORDER BY is_payer DESC, rowid`, booking.id,
    ).toArray().map(publicOccupant);
    return {
      ok: true,
      booking: publicBooking(booking),
      person: person ? publicPerson(person) : null,
      occupants,
    };
  }

  idImage(occupantId) {
    const oid = clean(occupantId, 40);
    const row = oid
      ? this.state.storage.sql.exec(
          `SELECT id_blob, id_mime, id_filename FROM occupants WHERE id = ?`, oid,
        ).toArray()[0]
      : null;
    if (!row || !row.id_blob) {
      return json({ ok: false, error: "No ID on file for that occupant." }, 404);
    }
    let bytes;
    try {
      bytes = base64ToBytes(row.id_blob);
    } catch (e) {
      return json({ ok: false, error: "No ID on file for that occupant." }, 404);
    }
    return new Response(bytes, {
      headers: {
        "content-type": row.id_mime || "application/octet-stream",
        "content-disposition": `inline; filename="${safeFilename(row.id_filename)}"`,
        "cache-control": "no-store",
      },
    });
  }

  search(q) {
    const needle = String(q || "").trim().slice(0, 80);
    if (!needle) return { results: [] };
    const like = "%" + needle.toLowerCase().replace(/([%_\\])/g, "\\$1") + "%";
    const people = this.state.storage.sql.exec(
      `SELECT DISTINCT p.* FROM persons p
       WHERE lower(p.name) LIKE ? ESCAPE '\\'
          OR lower(p.phone) LIKE ? ESCAPE '\\'
          OR EXISTS (
            SELECT 1 FROM occupants o
            JOIN bookings b ON b.id = o.booking_id
            WHERE lower(o.name) LIKE ? ESCAPE '\\'
              AND (o.person_id = p.id OR b.person_id = p.id)
          )
       ORDER BY p.name LIMIT 50`,
      like, like, like,
    ).toArray();
    return {
      results: people.map((p) => ({
        ...publicPerson(p),
        stays: this.state.storage.sql.exec(
          `SELECT * FROM bookings WHERE person_id = ? ORDER BY check_in`, p.id,
        ).toArray().map((b) => this.staySummary(b)),
      })),
    };
  }

  stayUpdate(body) {
    const booking = this.bookingById(body.id);
    if (!booking) return { ok: false, error: "No stay with that id." };
    const person = booking.person_id
      ? this.state.storage.sql.exec(`SELECT * FROM persons WHERE id = ?`, booking.person_id).toArray()[0]
      : null;
    const fields = {
      name: body.name !== undefined ? clean(body.name, 80) : null,
      phone: body.phone !== undefined ? clean(body.phone, 30) : null,
      email: body.email !== undefined ? clean(body.email, 120) : null,
      address: body.address !== undefined ? clean(body.address, 200) : null,
      notes: body.notes !== undefined ? clean(body.notes, 2000) : null,
    };
    if (fields.name === "") return { ok: false, error: "The guest needs a name." };
    if (fields.phone === "") return { ok: false, error: "The guest needs a mobile number." };
    if (fields.email === "") return { ok: false, error: "The guest needs an email." };
    const ops = [];
    if (Array.isArray(body.occupants)) {
      const existing = this.state.storage.sql.exec(
        `SELECT * FROM occupants WHERE booking_id = ? ORDER BY is_payer DESC, rowid`, booking.id,
      ).toArray();
      const byId = new Map(existing.map((o) => [o.id, o]));
      const keep = new Set();
      for (const raw of body.occupants) {
        const o = raw && typeof raw === "object" ? raw : {};
        const oId = clean(o.id, 40);
        if (oId) {
          const row = byId.get(oId);
          if (!row) return { ok: false, error: "Unknown occupant on that stay." };
          keep.add(oId);
          const nextName = o.name !== undefined ? clean(o.name, 80) : row.name;
          if (!nextName) return { ok: false, error: "Every occupant needs a name." };
          const ds = idDocSource(o);
          let doc = null;
          if (ds.src) {
            doc = parseIdDoc(ds.src, "That occupant");
            if (!doc.ok) return { ok: false, error: doc.error };
          }
          if (ds.remove && row.is_payer) {
            return { ok: false, error: "The paying guest must keep an ID on file." };
          }
          ops.push({
            kind: "update", id: row.id, name: nextName,
            nationality: o.nationality !== undefined ? (clean(o.nationality, 60) || null) : row.nationality,
            passportNo: o.passportNo !== undefined ? (clean(o.passportNo, 40) || null) : row.passport_no,
            doc, remove: !!ds.remove,
          });
        } else {
          const oName = clean(o.name, 80);
          if (!oName) continue;
          const ds = idDocSource(o);
          let doc = null;
          if (ds.src) {
            doc = parseIdDoc(ds.src, "That occupant");
            if (!doc.ok) return { ok: false, error: doc.error };
          }
          ops.push({
            kind: "insert", name: oName,
            nationality: clean(o.nationality, 60) || null,
            passportNo: clean(o.passportNo, 40) || null,
            doc,
          });
        }
      }
      for (const row of existing) {
        if (!row.is_payer && !keep.has(row.id)) ops.push({ kind: "delete", id: row.id });
      }
    }
    if (person) {
      this.state.storage.sql.exec(
        `UPDATE persons SET name = ?, phone = ?, email = ?, address = ?, notes = ? WHERE id = ?`,
        fields.name ?? person.name,
        fields.phone ?? person.phone,
        fields.email ?? person.email,
        fields.address ?? person.address,
        fields.notes ?? person.notes,
        person.id,
      );
    } else {
      const personId = crypto.randomUUID();
      this.state.storage.sql.exec(
        `INSERT INTO persons
          (id, name, phone, email, address, notes, payment_method, card_last4, card_network, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        personId,
        fields.name ?? booking.name,
        fields.phone ?? booking.phone,
        fields.email ?? booking.email,
        fields.address ?? (booking.address || ""),
        fields.notes ?? "",
        booking.payment_method ?? null,
        booking.card_last4 ?? null,
        booking.card_network ?? null,
        Date.now(),
      );
      this.state.storage.sql.exec(`UPDATE bookings SET person_id = ? WHERE id = ?`, personId, booking.id);
    }
    for (const op of ops) {
      if (op.kind === "update") {
        if (op.remove) {
          this.state.storage.sql.exec(
            `UPDATE occupants SET name = ?, nationality = ?, passport_no = ?,
               id_mime = NULL, id_filename = NULL, id_blob = NULL WHERE id = ?`,
            op.name, op.nationality, op.passportNo, op.id,
          );
        } else if (op.doc) {
          this.state.storage.sql.exec(
            `UPDATE occupants SET name = ?, nationality = ?, passport_no = ?,
               id_mime = ?, id_filename = ?, id_blob = ? WHERE id = ?`,
            op.name, op.nationality, op.passportNo, op.doc.mime, op.doc.filename, op.doc.blob, op.id,
          );
        } else {
          this.state.storage.sql.exec(
            `UPDATE occupants SET name = ?, nationality = ?, passport_no = ? WHERE id = ?`,
            op.name, op.nationality, op.passportNo, op.id,
          );
        }
      } else if (op.kind === "insert") {
        this.insertOccupant(booking.id, null, op.name, 0, op.nationality, op.passportNo, op.doc);
      } else {
        this.state.storage.sql.exec(`DELETE FROM occupants WHERE id = ?`, op.id);
      }
    }
    const s = this.stay(booking.id);
    return { ok: true, stay: { booking: s.booking, person: s.person, occupants: s.occupants } };
  }

  move(body) {
    const booking = this.bookingById(body.id);
    if (!booking) return { ok: false, error: "No stay with that id." };
    const roomId = clean(body.roomId, 20);
    const room = roomId
      ? this.state.storage.sql.exec(`SELECT * FROM rooms WHERE id = ?`, roomId).toArray()[0]
      : null;
    if (!room) return { ok: false, error: "Unknown room." };
    const delta = Math.round(Number(body.chargeDeltaPaise === undefined ? 0 : body.chargeDeltaPaise));
    if (!Number.isFinite(delta)) {
      return { ok: false, error: "chargeDeltaPaise must be a number of paise." };
    }
    const blocked = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM blocks WHERE type_id = ? AND start < ? AND end > ?`,
      room.type_id, booking.check_out, booking.check_in,
    ).one().n;
    if (blocked > 0) return { ok: false, error: "That room's type is blocked on those nights." };
    const taken = this.state.storage.sql.exec(
      `SELECT COUNT(*) AS n FROM bookings
       WHERE status = 'confirmed' AND room_id = ? AND id != ? AND check_in < ? AND check_out > ?`,
      room.id, booking.id, booking.check_out, booking.check_in,
    ).one().n;
    if (taken > 0) return { ok: false, error: "That room is taken on those nights." };
    this.state.storage.sql.exec(
      `UPDATE bookings SET room_id = ?, type_id = ?, amount = amount + ? WHERE id = ?`,
      room.id, room.type_id, delta, booking.id,
    );
    const updated = this.state.storage.sql.exec(`SELECT * FROM bookings WHERE id = ?`, booking.id).one();
    return { ok: true, booking: publicBooking(updated) };
  }

  setOccupantId(body) {
    const booking = this.bookingById(body.bookingId);
    if (!booking) return { ok: false, error: "No stay with that id." };
    const doc = parseIdDoc(body, "That occupant");
    if (!doc.ok) return { ok: false, error: doc.error };
    const occupantId = clean(body.occupantId, 40);
    if (occupantId) {
      const row = this.state.storage.sql.exec(
        `SELECT * FROM occupants WHERE id = ? AND booking_id = ?`, occupantId, booking.id,
      ).toArray()[0];
      if (!row) return { ok: false, error: "Unknown occupant on that stay." };
      this.state.storage.sql.exec(
        `UPDATE occupants SET id_mime = ?, id_filename = ?, id_blob = ? WHERE id = ?`,
        doc.mime, doc.filename, doc.blob, row.id,
      );
      const updated = this.state.storage.sql.exec(`SELECT * FROM occupants WHERE id = ?`, row.id).one();
      return { ok: true, occupant: publicOccupant(updated) };
    }
    const name = clean(body.name, 80);
    if (!name) return { ok: false, error: "A name is required for a new occupant." };
    const newId = this.insertOccupant(booking.id, null, name, 0,
      clean(body.nationality, 60) || null, clean(body.passportNo, 40) || null, doc);
    const created = this.state.storage.sql.exec(`SELECT * FROM occupants WHERE id = ?`, newId).one();
    return { ok: true, occupant: publicOccupant(created) };
  }
}

function publicBooking(b) {
  return {
    id: b.id,
    typeId: b.type_id,
    checkIn: b.check_in,
    checkOut: b.check_out,
    name: b.name,
    email: b.email,
    phone: b.phone,
    nights: b.nights,
    amount: b.amount,
    status: b.status,
    paymentId: b.payment_id,
    personId: b.person_id || null,
    roomId: b.room_id || null,
    address: b.address || null,
    paymentMethod: b.payment_method || null,
    cardLast4: b.card_last4 || null,
    cardNetwork: b.card_network || null,
  };
}

function publicPerson(p) {
  return {
    id: p.id,
    name: p.name,
    phone: p.phone,
    email: p.email,
    address: p.address,
    notes: p.notes,
    paymentMethod: p.payment_method || null,
    cardLast4: p.card_last4 || null,
    cardNetwork: p.card_network || null,
    createdAt: p.created_at,
  };
}

function publicOccupant(o) {
  return {
    id: o.id,
    name: o.name,
    isPayer: !!o.is_payer,
    nationality: o.nationality || null,
    passportNo: o.passport_no || null,
    idFilename: o.id_filename || null,
    idMime: o.id_mime || null,
    hasId: !!o.id_blob,
  };
}

function publicType(t) {
  return { id: t.id, name: t.name, summary: t.summary, guests: t.guests, count: t.count, price: t.price };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function iso(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(isoDate, n) {
  const d = new Date(isoDate + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(start, end) {
  return Math.round((Date.parse(end + "T00:00:00Z") - Date.parse(start + "T00:00:00Z")) / DAY);
}

function clean(value, max) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function parseIdDoc(src, who) {
  const label = who || "An ID";
  const filename = clean(src && src.filename, 160);
  const mime = clean(src && src.mime, 100);
  const data = src && typeof src.dataBase64 === "string" ? src.dataBase64.trim() : "";
  if (!filename || !mime || !data) {
    return { ok: false, error: label + " needs an ID with a filename, mime, and dataBase64." };
  }
  if (data.length > 6000000) return { ok: false, error: "That ID file is too large." };
  try {
    atob(data);
  } catch (e) {
    return { ok: false, error: "That ID file could not be decoded." };
  }
  return { ok: true, filename, mime, blob: data };
}

// An occupant's ID may arrive flat (filename/mime/dataBase64) or as o.idDoc;
// idDoc: null is an explicit removal request.
function idDocSource(o) {
  if (o.idDoc === null) return { remove: true };
  if (o.idDoc && typeof o.idDoc === "object") return { src: o.idDoc };
  if (o.filename !== undefined || o.mime !== undefined || o.dataBase64 !== undefined) return { src: o };
  return {};
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function safeFilename(name) {
  const base = String(name || "id")
    .replace(/[\r\n"\\]/g, "")
    .replace(/[^\w.\- ]+/g, "_")
    .trim();
  return (base || "id").slice(0, 100);
}
