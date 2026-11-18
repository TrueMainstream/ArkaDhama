export function guestHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Stay · Arka Dhama</title>
<style>
  :root { color-scheme: light; --ink:#241f16; --muted:#6f675b; --line:#e4dccb; --paper:#fbf7f0; --card:#fff; --green:#2d6a4f; --gold:#8c6a2f; }
  * { box-sizing: border-box; }
  body { margin:0; font:16px/1.45 Georgia, "Iowan Old Style", serif; color:var(--ink); background:var(--paper); }
  header { padding:28px 20px 8px; max-width:920px; margin:0 auto; }
  h1 { font-weight:500; font-size:34px; margin:0; letter-spacing:-0.02em; }
  header p { color:var(--muted); margin:6px 0 0; }
  main { max-width:920px; margin:0 auto; padding:8px 20px 64px; }
  .banner { background:#f3ead6; border:1px solid var(--line); padding:10px 14px; margin:16px 0; font:13px/1.4 system-ui, sans-serif; }
  form.dates { display:flex; gap:12px; flex-wrap:wrap; align-items:end; }
  label { display:flex; flex-direction:column; gap:4px; font:13px system-ui, sans-serif; color:var(--muted); }
  input, select { font:16px system-ui, sans-serif; padding:8px 10px; border:1px solid var(--line); background:#fff; color:var(--ink); }
  button { font:15px system-ui, sans-serif; background:var(--ink); color:#fff; border:0; padding:10px 16px; cursor:pointer; }
  button.secondary { background:#fff; color:var(--ink); border:1px solid var(--line); }
  .cards { display:grid; gap:14px; margin-top:18px; }
  article { background:var(--card); border:1px solid var(--line); padding:16px 18px; display:grid; grid-template-columns:1fr auto; gap:8px 18px; }
  article h2 { margin:0; font-weight:500; font-size:22px; }
  article p { margin:4px 0 0; color:var(--muted); }
  .price { text-align:right; }
  .price strong { display:block; font-size:20px; font-weight:500; }
  .gone { color:#8a3b2e; }
  .book { grid-column:1 / -1; display:none; gap:10px; flex-wrap:wrap; padding-top:8px; border-top:1px solid var(--line); }
  .book.open { display:flex; }
  .note { font:13px system-ui, sans-serif; color:var(--muted); margin-top:18px; }
  a { color:var(--gold); }
  #result { margin-top:16px; padding:14px; background:#eef6f0; border:1px solid #cfe0d4; display:none; }
  #result.show { display:block; }
</style>
</head>
<body>
<header>
  <h1>Arka Dhama</h1>
  <p>Mysore. Choose your nights and reserve a room.</p>
</header>
<main>
  <div class="banner">Prototype. Payment is recorded here and is not yet charged by Razorpay. A real card is not taken on this page.</div>
  <form class="dates" id="dates">
    <label>Check in<input type="date" name="from" required></label>
    <label>Check out<input type="date" name="to" required></label>
    <button type="submit">See rooms</button>
  </form>
  <div class="cards" id="cards"></div>
  <div id="result"></div>
  <p class="note">Staff use the <a href="/desk">desk page</a>. This page is the only way a guest reserves a room.</p>
</main>
<script>
const rupee = n => "₹" + (n/100).toLocaleString("en-IN");
const dates = document.getElementById("dates");
const today = new Date().toISOString().slice(0,10);
dates.from.min = today;
dates.from.value = today;
const out = new Date(); out.setDate(out.getDate()+2);
dates.to.value = out.toISOString().slice(0,10);

dates.addEventListener("submit", e => { e.preventDefault(); load(); });

const readFile = f => new Promise((ok, err) => {
  const r = new FileReader();
  r.onload = () => ok({ filename: f.name, mime: f.type, dataBase64: r.result.slice(r.result.indexOf(",") + 1) });
  r.onerror = () => err(r.error);
  r.readAsDataURL(f);
});

async function load() {
  const q = new URLSearchParams({ from: dates.from.value, to: dates.to.value });
  const data = await fetch("/api/availability?" + q).then(r => r.json());
  const box = document.getElementById("cards");
  box.innerHTML = "";
  for (const t of data.types) {
    const el = document.createElement("article");
    const free = t.free > 0;
    el.innerHTML =
      '<div><h2>' + t.name + '</h2><p>' + t.summary + '</p>' +
      '<p>' + t.guests + ' guests · ' + t.free + ' of ' + t.total + ' free</p></div>' +
      '<div class="price"><strong>' + rupee(t.totalPrice) + '</strong>' +
      t.nights + ' nights · ' + rupee(t.nightly) + ' / night' +
      (free ? '<div><button data-book="' + t.id + '">Reserve</button></div>' : '<div class="gone">Not available</div>') +
      '</div>' +
      '<form class="book" data-form="' + t.id + '">' +
      '<input name="name" placeholder="Full name" required>' +
      '<input name="email" type="email" placeholder="Email" required>' +
      '<input name="phone" placeholder="Mobile" required>' +
      '<input name="address" placeholder="Address" required>' +
      '<select name="pay">' +
      '<option value="upi">UPI</option>' +
      '<option value="indian_card">Indian card</option>' +
      '<option value="international_card">International card</option>' +
      '<option value="pay_at_desk">Pay at the desk</option>' +
      '</select>' +
      '<span class="cardrow" style="display:none">' +
      '<input name="last4" placeholder="Last 4 digits" maxlength="4" inputmode="numeric" pattern="[0-9]{4}">' +
      '<select name="network"><option>Visa</option><option>Mastercard</option><option>RuPay</option><option>Amex</option></select>' +
      '</span>' +
      '<span>Government ID (image or PDF)</span>' +
      '<input name="idfile" type="file" accept="image/*,application/pdf" required>' +
      '<button type="button" class="secondary addguest">Add another guest</button>' +
      '<button type="submit" disabled>Confirm reservation</button>' +
      '</form>';
    box.appendChild(el);
  }
  box.querySelectorAll("[data-book]").forEach(btn => {
    btn.addEventListener("click", () => {
      box.querySelector('[data-form="' + btn.dataset.book + '"]').classList.add("open");
    });
  });
  box.querySelectorAll("[data-form]").forEach(form => {
    const confirmBtn = form.querySelector("button[type=submit]");
    form.idfile.addEventListener("change", () => { confirmBtn.disabled = form.idfile.files.length === 0; });
    const cardrow = form.querySelector(".cardrow");
    form.pay.addEventListener("change", () => {
      const v = form.pay.value;
      cardrow.style.display = (v === "indian_card" || v === "international_card") ? "" : "none";
    });
    form.querySelector(".addguest").addEventListener("click", () => {
      const row = document.createElement("span");
      row.className = "grow";
      row.innerHTML =
        '<input name="gname" placeholder="Guest name" required>' +
        '<input name="gnat" placeholder="Nationality (optional)">' +
        '<input name="gpass" placeholder="Passport no. (optional)">' +
        '<input name="gfile" type="file" accept="image/*,application/pdf" title="Optional ID (image or PDF)">';
      form.insertBefore(row, form.querySelector(".addguest"));
    });
    form.addEventListener("submit", async ev => {
      ev.preventDefault();
      const key = sessionStorage.getItem("arka-key") || crypto.randomUUID();
      sessionStorage.setItem("arka-key", key);
      const payerFile = await readFile(form.idfile.files[0]);
      const occupants = [{ name: form.name.value, filename: payerFile.filename, mime: payerFile.mime, dataBase64: payerFile.dataBase64 }];
      for (const row of form.querySelectorAll(".grow")) {
        const guest = {
          name: row.querySelector("[name=gname]").value,
          nationality: row.querySelector("[name=gnat]").value,
          passportNo: row.querySelector("[name=gpass]").value,
        };
        const gf = row.querySelector("[name=gfile]").files[0];
        if (gf) {
          const d = await readFile(gf);
          guest.filename = d.filename; guest.mime = d.mime; guest.dataBase64 = d.dataBase64;
        }
        occupants.push(guest);
      }
      const card = form.pay.value === "indian_card" || form.pay.value === "international_card";
      const body = {
        key, typeId: form.dataset.form,
        checkIn: dates.from.value, checkOut: dates.to.value,
        name: form.name.value, email: form.email.value, phone: form.phone.value,
        address: form.address.value,
        paymentMethod: form.pay.value,
        cardLast4: card ? form.last4.value : "",
        cardNetwork: card ? form.network.value : "",
        occupants,
      };
      const res = await fetch("/api/book", { method:"POST", headers:{ "content-type":"application/json" }, body: JSON.stringify(body) }).then(r => r.json());
      const out = document.getElementById("result");
      out.classList.add("show");
      if (!res.ok) { out.textContent = res.error; return; }
      const b = res.booking;
      out.innerHTML = "<strong>" + b.id + "</strong> · " + b.nights + " nights · " + rupee(b.amount) +
        (res.repeat ? " · this is the reservation you already made." : " · reserved. A confirmation will be sent by email and WhatsApp once those are connected.");
      sessionStorage.removeItem("arka-key");
      load();
    });
  });
}
load();
</script>
</body>
</html>`;
}
