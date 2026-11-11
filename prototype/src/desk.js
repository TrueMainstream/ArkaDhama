export function deskHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Desk · Arka Dhama</title>
<style>
  :root { --ink:#241f16; --muted:#6f675b; --line:#e4dccb; --paper:#fbf7f0; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.4 system-ui, sans-serif; color:var(--ink); background:var(--paper); }
  main { max-width:960px; margin:0 auto; padding:24px 20px 64px; }
  h1 { font:500 28px Georgia, serif; margin:0; }
  h2 { font:600 16px system-ui, sans-serif; margin:24px 0 8px; }
  a { color:#8c6a2f; }
  table { width:100%; border-collapse:collapse; background:#fff; }
  th, td { text-align:left; padding:8px 10px; border-bottom:1px solid var(--line); vertical-align:top; }
  th { font-size:12px; letter-spacing:.04em; text-transform:uppercase; color:var(--muted); }
  form { display:flex; gap:8px; flex-wrap:wrap; align-items:end; margin:8px 0 16px; }
  label { display:flex; flex-direction:column; gap:4px; font-size:12px; color:var(--muted); }
  input, select { font:14px system-ui, sans-serif; padding:7px 8px; border:1px solid var(--line); }
  button { font:14px system-ui, sans-serif; background:var(--ink); color:#fff; border:0; padding:8px 12px; cursor:pointer; }
  .msg { min-height:1.2em; color:#2d6a4f; }
  .tag { font-size:12px; color:var(--muted); }
  .err { font-size:13px; color:#a4442f; }
  .click { cursor:pointer; }
  textarea { font:14px system-ui, sans-serif; padding:7px 8px; border:1px solid var(--line); }
  .panel { background:#fff; border:1px solid var(--line); padding:14px 16px; }
  .occ { display:flex; flex-direction:column; gap:4px; padding:8px 0; border-bottom:1px solid var(--line); }
</style>
</head>
<body>
<main>
  <h1>Desk</h1>
  <p><a href="/">Guest page</a></p>
  <p class="msg" id="msg"></p>
  <h2>The day</h2>
  <form id="day">
    <label>Date<input id="date" type="date" required></label>
    <button>Show</button>
  </form>
  <h2>Arriving</h2>
  <table><thead><tr><th>Guest</th><th>Room</th><th>Paid</th></tr></thead><tbody id="arriving"></tbody></table>
  <h2>In house</h2>
  <table><thead><tr><th>Guest</th><th>Room</th><th>Paid</th></tr></thead><tbody id="inhouse"></tbody></table>
  <h2>Departing</h2>
  <table><thead><tr><th>Guest</th><th>Room</th><th>Paid</th></tr></thead><tbody id="departing"></tbody></table>
  <h2>Rooms</h2>
  <table><thead><tr><th>Room</th><th>Status</th></tr></thead><tbody id="roomsList"></tbody></table>
  <h2>Stay</h2>
  <div id="stayPanel"><p class="tag">Choose a stay from the lists above or from a search.</p></div>
  <h2>Find a guest</h2>
  <form id="search">
    <label>Name or phone<input name="q" placeholder="Name or mobile" required></label>
    <button>Search</button>
  </form>
  <div id="results"></div>
  <h2>Change a nightly price</h2>
  <form id="price">
    <label>Room<select name="typeId"></select></label>
    <label>Rupees / night<input name="price" type="number" min="100" required></label>
    <label>Only from<input name="start" type="date"></label>
    <label>until<input name="end" type="date"></label>
    <button>Save price</button>
  </form>
  <h2>Block dates</h2>
  <form id="block">
    <label>Room<select name="typeId"></select></label>
    <label>From<input name="start" type="date" required></label>
    <label>Until<input name="end" type="date" required></label>
    <label>Reason<input name="reason" placeholder="Guru's guest, maintenance, program"></label>
    <button>Block</button>
  </form>
</main>
<script>
const rupee = n => "₹" + (n/100).toLocaleString("en-IN");
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
let types = [], rooms = [], stayId = null, stayData = null, addedOcc = [], idUrl = null;
function say(text) { document.getElementById("msg").textContent = text; }
function localToday() {
  const d = new Date();
  return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
}
function payBits(s) {
  const bits = [];
  if (s.paymentMethod) bits.push(s.paymentMethod);
  if (s.cardLast4) bits.push("ending " + s.cardLast4);
  return bits.join(" · ");
}
function roomLabel(s) {
  const r = rooms.find(x => x.id === s.roomId);
  if (r) return r.name;
  const t = types.find(x => x.id === (s.roomId || s.typeId));
  return t ? t.name : (s.roomId || s.typeId || "");
}
function stayRow(s) {
  const pay = payBits(s);
  return "<tr class='click' data-id='" + esc(s.id) + "'><td>" + esc(s.name) + "<br>" + esc(s.phone) +
    "</td><td>" + esc(roomLabel(s)) + "</td><td>" + rupee(s.amount) +
    (pay ? "<br><span class='tag'>" + esc(pay) + "</span>" : "") + "</td></tr>";
}
function fillList(id, stays) {
  document.getElementById(id).innerHTML = (stays || []).map(stayRow).join("") ||
    "<tr><td colspan='3'>None.</td></tr>";
}
function roomRow(r) {
  let who;
  if (r.status === "occupied" && r.stay) {
    who = "<span class='click' data-id='" + esc(r.stay.id) + "'>" + esc(r.stay.name) + "</span>";
  } else if (r.status === "blocked") {
    who = "Blocked · " + esc(r.reason || "");
  } else {
    who = "Empty";
  }
  return "<tr><td>" + esc(r.name) + "</td><td>" + who + "</td></tr>";
}
async function loadDesk() {
  const date = document.getElementById("date").value || localToday();
  const data = await fetch("/api/desk?date=" + encodeURIComponent(date)).then(r => r.json());
  types = data.types || [];
  rooms = data.rooms || [];
  for (const sel of document.querySelectorAll("select[name=typeId]")) {
    const current = sel.value;
    sel.innerHTML = types.map(t => "<option value='" + t.id + "'>" + t.name + " · " + rupee(t.price) + "</option>").join("");
    if (current) sel.value = current;
  }
  fillList("arriving", data.arriving);
  fillList("inhouse", data.inHouse);
  fillList("departing", data.departing);
  document.getElementById("roomsList").innerHTML = rooms.map(roomRow).join("") ||
    "<tr><td colspan='2'>No rooms.</td></tr>";
}
async function openStay(id) {
  stayId = id;
  addedOcc = [];
  stayData = await fetch("/api/stay?id=" + encodeURIComponent(id)).then(r => r.json());
  renderStay();
  document.getElementById("stayPanel").scrollIntoView({ block: "nearest" });
}
function occRow(o) {
  let row = "<div class='occ'><div><strong>" + esc(o.name) + "</strong>";
  if (o.isPayer) row += " <span class='tag'>payer</span>";
  if (o.nationality) row += " <span class='tag'>" + esc(o.nationality) + (o.passportNo ? " · " + esc(o.passportNo) : "") + "</span>";
  row += "</div>";
  if (o.id && o.hasId) row += "<a href='#' data-occ='" + esc(o.id) + "'>ID · " + esc(o.idFilename || "view") + "</a>";
  row += "<label>" + (o.hasId ? "Replace ID" : "Add ID") +
    "<input type='file' data-up='" + (o.id ? "id:" + esc(o.id) : "name:" + esc(o.name)) + "'></label></div>";
  return row;
}
function renderStay() {
  if (!stayData) return;
  const b = stayData.booking || {}, p = stayData.person || {};
  const bits = [];
  if (p.paymentMethod) bits.push(esc(p.paymentMethod));
  if (p.cardNetwork) bits.push(esc(p.cardNetwork));
  if (p.cardLast4) bits.push("ending " + esc(p.cardLast4));
  let html = "<div class='panel'><p><strong>" + esc(b.id) + "</strong> · " + rupee(b.amount || 0) +
    (bits.length ? " · " + bits.join(" · ") : "") + "</p>";
  html += "<form id='stayForm'>" +
    "<label>Name<input name='name' value='" + esc(p.name) + "'></label>" +
    "<label>Phone<input name='phone' value='" + esc(p.phone) + "'></label>" +
    "<label>Email<input name='email' value='" + esc(p.email) + "'></label>" +
    "<label>Address<input name='address' value='" + esc(p.address) + "'></label>" +
    "<label>Notes<textarea name='notes' rows='3'>" + esc(p.notes) + "</textarea></label>" +
    "<button>Save stay</button> <span class='err' id='stayErr'></span></form>";
  html += "<h2>Occupants</h2>" + (stayData.occupants || []).concat(addedOcc).map(occRow).join("");
  html += "<form id='addOcc'><label>Add occupant<input name='occName' placeholder='Name only'></label><button>Add</button></form>";
  html += "<h2>Move to another room</h2>";
  html += "<form id='moveForm'><label>Room<select name='roomId'>" +
    rooms.map(r => "<option value='" + esc(r.id) + "'" + (b.roomId === r.id ? " selected" : "") + ">" + esc(r.name) + "</option>").join("") +
    "</select></label><label>Difference ₹<input name='delta' type='number' step='0.01' value='0'></label>" +
    "<button>Move</button> <span class='err' id='moveErr'></span></form></div>";
  document.getElementById("stayPanel").innerHTML = html;
}
function postJson(url, body) {
  return fetch(url, { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) }).then(r => r.json());
}
function stayPayload() {
  const f = document.getElementById("stayForm");
  return {
    id: stayId,
    name: f.elements.name.value, phone: f.phone.value, email: f.email.value,
    address: f.address.value, notes: f.notes.value,
    occupants: (stayData.occupants || []).map(o => ({ id: o.id, name: o.name }))
      .concat(addedOcc.map(a => ({ name: a.name })))
  };
}
async function saveStay() {
  if (!document.getElementById("stayForm")) return { ok:false, error:"Open a stay first." };
  const res = await postJson("/api/stay", stayPayload());
  const err = document.getElementById("stayErr");
  if (res.ok) {
    if (err) err.textContent = "";
    say("Stay saved.");
    await openStay(stayId);
    loadDesk();
  } else if (err) {
    err.textContent = res.error || "Could not save.";
  }
  return res;
}
function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
async function uploadId(ref, file) {
  say("Uploading ID…");
  const dataUrl = String(await readAsDataURL(file));
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  let occupantId = null;
  if (ref.indexOf("id:") === 0) {
    occupantId = ref.slice(3);
  } else {
    // Occupant not saved yet: save the stay so the server assigns an id, then match by name.
    const saved = await saveStay();
    if (!saved.ok) { say(saved.error || "Save the stay before adding the ID."); return; }
    const want = ref.slice(5);
    const named = (stayData.occupants || []).filter(o => o.name === want);
    const match = named.find(o => !o.hasId) || named[0];
    if (!match) { say("Could not find " + want + " after saving."); return; }
    occupantId = match.id;
  }
  const res = await postJson("/api/occupant-id", {
    bookingId: stayId, occupantId: occupantId,
    filename: file.name, mime: file.type, dataBase64: base64
  });
  if (res.ok) { say("ID saved."); await openStay(stayId); loadDesk(); }
  else say(res.error || "Could not save the ID.");
}
async function openIdFile(occupantId) {
  const res = await fetch("/api/id?occupant=" + encodeURIComponent(occupantId));
  if (!res.ok) { say("Could not load that ID."); return; }
  const blob = await res.blob();
  if (idUrl) URL.revokeObjectURL(idUrl);
  idUrl = URL.createObjectURL(blob);
  window.open(idUrl, "_blank");
}
async function moveStay(f) {
  const res = await postJson("/api/move", {
    id: stayId, roomId: f.roomId.value,
    chargeDeltaPaise: Math.round(Number(f.delta.value || 0) * 100)
  });
  const err = document.getElementById("moveErr");
  if (res.ok) {
    if (err) err.textContent = "";
    say("Moved.");
    await openStay(stayId);
    loadDesk();
  } else if (err) {
    err.textContent = res.error || "Move failed.";
  }
}
document.getElementById("day").addEventListener("submit", e => { e.preventDefault(); loadDesk(); });
document.getElementById("date").addEventListener("change", () => loadDesk());
document.querySelector("main").addEventListener("click", e => {
  const link = e.target.closest("a[data-occ]");
  if (link) { e.preventDefault(); openIdFile(link.dataset.occ); return; }
  const hit = e.target.closest("[data-id]");
  if (hit) openStay(hit.dataset.id);
});
document.getElementById("stayPanel").addEventListener("submit", e => {
  e.preventDefault();
  const f = e.target;
  if (f.id === "stayForm") saveStay();
  else if (f.id === "addOcc") {
    const n = f.occName.value.trim();
    if (n) { addedOcc.push({ name: n }); renderStay(); }
  }
  else if (f.id === "moveForm") moveStay(f);
});
document.getElementById("stayPanel").addEventListener("change", e => {
  if (e.target.type === "file" && e.target.dataset.up && e.target.files[0]) {
    uploadId(e.target.dataset.up, e.target.files[0]);
    e.target.value = "";
  }
});
document.getElementById("search").addEventListener("submit", async e => {
  e.preventDefault();
  const q = e.target.q.value.trim();
  if (!q) return;
  const data = await fetch("/api/search?q=" + encodeURIComponent(q)).then(r => r.json());
  const out = (data.results || []).map(r => {
    const p = r.person || {};
    const rows = (r.stays || []).map(s =>
      "<tr class='click' data-id='" + esc(s.id) + "'><td>" + esc(s.checkIn || "") + " → " + esc(s.checkOut || "") +
      "</td><td>" + esc(roomLabel(s)) + "</td><td>" + rupee(s.amount || 0) + "</td></tr>").join("") ||
      "<tr><td colspan='3'>No stays.</td></tr>";
    return "<p><strong>" + esc(p.name) + "</strong>" + (p.phone ? " · " + esc(p.phone) : "") + "</p>" +
      "<table><thead><tr><th>Dates</th><th>Room</th><th>Paid</th></tr></thead><tbody>" + rows + "</tbody></table>";
  }).join("");
  document.getElementById("results").innerHTML = out || "<p class='tag'>No one found.</p>";
});
document.getElementById("price").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const res = await fetch("/api/price", { method:"POST", headers:{ "content-type":"application/json" },
    body: JSON.stringify({ typeId: f.typeId.value, price: Number(f.price.value), start: f.start.value, end: f.end.value }) }).then(r => r.json());
  say(res.ok ? "Price saved. Bookings already paid keep their price." : res.error);
  if (res.ok) loadDesk();
});
document.getElementById("block").addEventListener("submit", async e => {
  e.preventDefault();
  const f = e.target;
  const res = await fetch("/api/block", { method:"POST", headers:{ "content-type":"application/json" },
    body: JSON.stringify({ typeId: f.typeId.value, start: f.start.value, end: f.end.value, reason: f.reason.value }) }).then(r => r.json());
  say(res.ok ? "Dates blocked." : res.error);
  if (res.ok) { f.reset(); loadDesk(); }
});
document.getElementById("date").value = localToday();
loadDesk();
</script>
</body>
</html>`;
}
