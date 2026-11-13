// Staff order board for Arka Dhama.
// staffHtml() returns one self-contained HTML document; the /api/staff/* endpoints are another lane.

export function staffHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Staff order board · Arka Dhama</title>
<style>
  :root {
    --bg: #fbf7f0;
    --ink: #241f16;
    --muted: #6f675b;
    --line: #e4dccb;
    --accent: #8c6a2f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    background: var(--bg);
    color: var(--ink);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  main { max-width: 960px; margin: 0 auto; padding: 20px 20px 64px; }
  h1 { font: 500 28px Georgia, "Times New Roman", serif; margin: 8px 0 2px; }
  h2 { font: 600 16px system-ui, sans-serif; margin: 28px 0 8px; }
  a { color: var(--accent); }
  nav.top { display: flex; gap: 18px; font-size: 14px; }
  .muted { color: var(--muted); }
  .ticket {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 14px;
    align-items: baseline;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 10px 14px;
    margin: 8px 0;
    cursor: pointer;
  }
  .ticket:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
  .ticket .name { font-weight: 600; }
  .ticket .meta { color: var(--muted); font-size: 13px; }
  .ticket .status { text-transform: capitalize; }
  .ticket .total { margin-left: auto; font-weight: 600; white-space: nowrap; }
  .detail-head { cursor: default; }
  table.lines { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 14px; }
  table.lines th, table.lines td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }
  table.lines th { font-size: 12px; letter-spacing: .04em; text-transform: uppercase; color: var(--muted); }
  table.lines .num { text-align: right; white-space: nowrap; }
  .totals { max-width: 320px; margin: 10px 0; }
  .totals div { display: flex; justify-content: space-between; gap: 16px; padding: 3px 0; border-bottom: 1px solid var(--line); }
  .totals span:first-child { color: var(--muted); }
  .totals .grand span:last-child { font-weight: 700; }
  button {
    font: 14px system-ui, sans-serif;
    min-height: 38px;
    padding: 6px 16px;
    border: 1px solid var(--accent);
    border-radius: 6px;
    background: var(--accent);
    color: var(--bg);
    cursor: pointer;
  }
  button.plain { background: transparent; color: var(--accent); border-color: var(--line); }
  button:disabled { opacity: 0.5; cursor: default; }
  button:focus-visible, input:focus-visible, select:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
  input, select {
    font: 14px system-ui, sans-serif;
    color: inherit;
    background: transparent;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 7px 10px;
  }
  form .field { display: flex; flex-direction: column; gap: 3px; margin: 10px 0; max-width: 420px; }
  form .field label { font-size: 12px; color: var(--muted); }
  fieldset { border: 1px solid var(--line); border-radius: 8px; margin: 14px 0; padding: 10px 12px 12px; }
  legend { font-size: 12px; color: var(--muted); padding: 0 6px; }
  .line-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 8px 0; align-items: center; }
  .line-row .line-item { width: 150px; }
  .line-row .line-qty { width: 84px; }
  .line-row .line-note { flex: 1 1 140px; }
  .actions { display: flex; gap: 10px; margin: 12px 0; }
  .actions button { min-height: 44px; padding: 8px 20px; }
  @media (max-width: 640px) {
    button, input, select { min-height: 44px; }
    form .field { max-width: none; }
    form .field input, form .field select { width: 100%; }
    .line-row { flex-direction: column; align-items: stretch; }
    .line-row .line-item, .line-row .line-qty, .line-row .line-note { width: 100%; }
    .ticket .total { margin-left: 0; }
  }
</style>
</head>
<body>
<main>
  <nav class="top">
    <a href="/">Menu</a>
    <a href="/login">Sign in</a>
    <a href="/admin">Admin</a>
  </nav>
  <h1>Staff order board</h1>
  <p id="avg" class="muted">Today&rsquo;s average wait: &mdash;</p>
  <p id="message" class="muted" hidden></p>

  <section>
    <h2>Active</h2>
    <div id="active"><p class="muted">Loading&hellip;</p></div>
  </section>

  <section id="detail-section" hidden>
    <h2>Order detail</h2>
    <div id="detail"></div>
  </section>

  <section>
    <h2>Completed</h2>
    <div id="completed"><p class="muted">Loading&hellip;</p></div>
  </section>

  <section>
    <h2>Order at the counter</h2>
    <p class="muted">This is for someone standing at the counter, not the customer path.</p>
    <form id="counter-form">
      <div class="field">
        <label for="cf-name">Name</label>
        <input id="cf-name" type="text" autocomplete="off" required>
      </div>
      <div class="field">
        <label for="cf-mobile">Mobile</label>
        <input id="cf-mobile" type="text" inputmode="tel" autocomplete="off">
      </div>
      <div class="field">
        <label for="cf-service">Service</label>
        <select id="cf-service">
          <option value="dine-in">Dine in</option>
          <option value="takeaway">Takeaway</option>
          <option value="delivery">Delivery</option>
        </select>
      </div>
      <div class="field">
        <label for="cf-table">Table</label>
        <input id="cf-table" type="text" autocomplete="off">
      </div>
      <div class="field">
        <label for="cf-address">Address</label>
        <input id="cf-address" type="text" autocomplete="off">
      </div>
      <div class="field">
        <label for="cf-note">Note</label>
        <input id="cf-note" type="text" autocomplete="off">
      </div>
      <fieldset>
        <legend>Lines</legend>
        <div id="cf-lines"></div>
        <button type="button" id="cf-add" class="plain">Add a line</button>
      </fieldset>
      <button type="submit" id="cf-place">Place order</button>
      <p id="cf-result" class="muted" hidden></p>
    </form>
  </section>
</main>
<script>
"use strict";
(function () {
  var KEY_NAME = "arka-counter-key";
  var STATUS_ACTIONS = {
    placed: [["Accept", "accepted"], ["Cancel", "cancelled"]],
    accepted: [["Ready", "ready"], ["Cancel", "cancelled"]],
    ready: [["Complete", "completed"], ["Cancel", "cancelled"]]
  };
  var pollTimer = null;
  var waitTimer = null;
  var halted = false;
  var detailId = null;

  function esc(value) {
    return String(value === null || value === undefined ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function money(paise) {
    var amount = paise === null || paise === undefined ? 0 : paise;
    return "₹" + (Number(amount) / 100).toLocaleString("en-IN");
  }

  function hasValue(value) {
    return value !== null && value !== undefined && String(value) !== "";
  }

  function serviceLabel(service) {
    var key = hasValue(service) ? String(service).trim().toLowerCase() : "";
    if (key === "dine-in" || key === "dinein" || key === "dine_in" || key === "dine in") return "Dine in";
    if (key === "takeaway" || key === "take-away" || key === "take_away" || key === "take away") return "Takeaway";
    if (key === "delivery") return "Delivery";
    return hasValue(service) ? String(service) : "";
  }

  function placedMillis(placedAt) {
    if (!hasValue(placedAt)) return null;
    var asNumber = Number(placedAt);
    if (isFinite(asNumber)) return asNumber;
    var parsed = Date.parse(String(placedAt));
    return isNaN(parsed) ? null : parsed;
  }

  function waitingText(placedAt) {
    var start = placedMillis(placedAt);
    if (start === null) return "—";
    return String(Math.floor((Date.now() - start) / 60000)) + " min waiting";
  }

  function message(text) {
    var el = document.getElementById("message");
    el.textContent = text;
    el.hidden = false;
  }

  function clearMessage() {
    var el = document.getElementById("message");
    el.textContent = "";
    el.hidden = true;
  }

  function counterResult(text) {
    var el = document.getElementById("cf-result");
    el.textContent = text;
    el.hidden = false;
  }

  function signedOut() {
    if (halted) return;
    halted = true;
    stopTimers();
    document.body.innerHTML = '<main><h1>Staff sign-in required</h1><p><a href="/login">Sign in</a></p></main>';
  }

  function request(method, url, body) {
    var init = { method: method, credentials: "same-origin", headers: {} };
    if (body !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(body);
    }
    return fetch(url, init).then(function (response) {
      if (response.status === 401 || response.status === 403) {
        signedOut();
        throw new Error("Staff sign-in required");
      }
      return response.json().then(null, function () { return {}; });
    });
  }

  function activeTicketHtml(order) {
    var html = "";
    html += '<div class="ticket" role="button" tabindex="0" data-id="' + esc(order.id) + '">';
    html += '<span class="name">' + esc(order.name) + "</span>";
    html += '<span class="meta">' + esc(serviceLabel(order.service)) + "</span>";
    if (hasValue(order.table)) {
      html += '<span class="meta">Table ' + esc(order.table) + "</span>";
    } else if (hasValue(order.address)) {
      html += '<span class="meta">' + esc(order.address) + "</span>";
    }
    html += '<span class="meta status">' + esc(order.status) + "</span>";
    html += '<span class="total">' + money(order.total) + "</span>";
    html += '<span class="meta wait" data-placed="' + esc(order.placedAt) + '">' + esc(waitingText(order.placedAt)) + "</span>";
    html += "</div>";
    return html;
  }

  function completedTicketHtml(order) {
    var minutes = null;
    if (hasValue(order.waitSeconds)) {
      var seconds = Number(order.waitSeconds);
      if (isFinite(seconds)) minutes = Math.floor(seconds / 60);
    }
    var html = "";
    html += '<div class="ticket" role="button" tabindex="0" data-id="' + esc(order.id) + '">';
    html += '<span class="name">' + esc(order.name) + "</span>";
    html += '<span class="meta">#' + esc(order.id) + "</span>";
    html += '<span class="total">' + money(order.total) + "</span>";
    html += '<span class="meta">' + (minutes === null ? "—" : String(minutes)) + " min wait</span>";
    html += "</div>";
    return html;
  }

  function render(data) {
    var avgEl = document.getElementById("avg");
    if (data.averageWaitMinutes === null || data.averageWaitMinutes === undefined) {
      avgEl.textContent = "Today's average wait: —";
    } else {
      avgEl.textContent = "Today's average wait: " + String(data.averageWaitMinutes) + " min";
    }
    var active = data.active || [];
    var completed = data.completed || [];
    var html = "";
    for (var i = 0; i < active.length; i++) html += activeTicketHtml(active[i]);
    document.getElementById("active").innerHTML = html || '<p class="muted">No active tickets.</p>';
    html = "";
    for (var j = 0; j < completed.length; j++) html += completedTicketHtml(completed[j]);
    document.getElementById("completed").innerHTML = html || '<p class="muted">No completed tickets yet today.</p>';
  }

  function updateWaits() {
    var nodes = document.querySelectorAll("#active .wait[data-placed]");
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].textContent = waitingText(nodes[i].getAttribute("data-placed"));
    }
  }

  function load() {
    if (halted) return;
    request("GET", "/api/staff/orders").then(function (data) {
      if (halted) return;
      if (!data || data.ok === false) {
        message("Could not load the order list.");
        return;
      }
      clearMessage();
      render(data);
    }).catch(function () {
      if (!halted) message("Could not reach the server. Retrying.");
    });
  }

  function stopTimers() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    if (waitTimer !== null) {
      clearInterval(waitTimer);
      waitTimer = null;
    }
  }

  function startTimers() {
    if (halted) return;
    stopTimers();
    // this client poll must not arm a server alarm or cron
    pollTimer = setInterval(load, 5000);
    // Rewrites the waiting labels from Date.now(); this timer does not fetch.
    waitTimer = setInterval(updateWaits, 30000);
  }

  function detailHeadHtml(order) {
    var html = "";
    html += '<div class="ticket detail-head">';
    html += '<span class="name">' + esc(order.name) + "</span>";
    html += '<span class="meta">#' + esc(order.id) + "</span>";
    if (hasValue(order.phone)) {
      html += '<span class="meta">' + esc(order.phone) + "</span>";
    }
    html += '<span class="meta">' + esc(serviceLabel(order.service)) + "</span>";
    if (hasValue(order.table)) {
      html += '<span class="meta">Table ' + esc(order.table) + "</span>";
    } else if (hasValue(order.address)) {
      html += '<span class="meta">' + esc(order.address) + "</span>";
    }
    html += '<span class="meta status">' + esc(order.status) + "</span>";
    html += '<span class="total">' + money(order.total) + "</span>";
    html += "</div>";
    return html;
  }

  function detailHtml(order) {
    var html = detailHeadHtml(order);
    var lines = order.lines || order.items || [];
    if (lines.length) {
      html += '<table class="lines"><thead><tr><th>Item</th><th>Qty</th><th>Note</th><th class="num">Unit</th><th class="num">Total</th></tr></thead><tbody>';
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i] || {};
        var unit = line.unit;
        if (unit === null || unit === undefined) unit = line.unitPrice;
        if (unit === null || unit === undefined) unit = line.price;
        var lineTotal = line.total;
        if (lineTotal === null || lineTotal === undefined) lineTotal = line.lineTotal;
        if ((lineTotal === null || lineTotal === undefined) && unit !== null && unit !== undefined) {
          lineTotal = Number(unit) * Number(line.qty);
        }
        html += "<tr><td>" + esc(line.name) + "</td>";
        html += "<td>" + esc(line.qty) + "</td>";
        html += "<td>" + esc(line.note) + "</td>";
        html += '<td class="num">' + money(unit) + "</td>";
        html += '<td class="num">' + money(lineTotal) + "</td></tr>";
      }
      html += "</tbody></table>";
    } else {
      html += '<p class="muted">No lines on this order.</p>';
    }
    html += '<div class="totals">';
    html += "<div><span>Subtotal</span><span>" + money(order.subtotal) + "</span></div>";
    html += "<div><span>Tax</span><span>" + money(order.tax) + "</span></div>";
    html += '<div class="grand"><span>Total</span><span>' + money(order.total) + "</span></div>";
    html += "</div>";
    var actions = STATUS_ACTIONS[order.status] || [];
    if (actions.length) {
      html += '<div class="actions">';
      for (var a = 0; a < actions.length; a++) {
        var style = actions[a][1] === "cancelled" ? ' class="plain"' : "";
        html += '<button type="button"' + style + ' data-id="' + esc(order.id) + '" data-status="' + esc(actions[a][1]) + '">' + esc(actions[a][0]) + "</button>";
      }
      html += "</div>";
    }
    return html;
  }

  function showOrder(id) {
    detailId = id;
    request("GET", "/api/staff/order?id=" + encodeURIComponent(id)).then(function (data) {
      if (halted) return;
      var section = document.getElementById("detail-section");
      var box = document.getElementById("detail");
      if (!data || data.ok === false || !data.order) {
        box.innerHTML = '<p class="muted">Could not load this order.</p>';
        section.hidden = false;
        return;
      }
      box.innerHTML = detailHtml(data.order);
      section.hidden = false;
    }).catch(function () {
      if (halted) return;
      document.getElementById("detail").innerHTML = '<p class="muted">Could not load this order.</p>';
      document.getElementById("detail-section").hidden = false;
    });
  }

  function setStatus(id, status, button) {
    if (button) button.disabled = true;
    request("POST", "/api/staff/status", { id: id, status: status }).then(function (data) {
      if (halted) return;
      if (!data || data.ok === false) {
        if (button) button.disabled = false;
        message("Could not update the order status.");
        return;
      }
      clearMessage();
      load();
      if (detailId !== null) showOrder(detailId);
    }).catch(function () {
      if (!halted && button) button.disabled = false;
    });
  }

  function ticketFromEvent(event) {
    var target = event.target;
    if (!target || !target.closest) return null;
    return target.closest(".ticket");
  }

  function openFromList(event) {
    var ticket = ticketFromEvent(event);
    if (!ticket) return;
    var id = ticket.getAttribute("data-id");
    if (id === null || id === "") return;
    showOrder(id);
  }

  function openKey(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openFromList(event);
  }

  document.getElementById("active").addEventListener("click", openFromList);
  document.getElementById("completed").addEventListener("click", openFromList);
  document.getElementById("active").addEventListener("keydown", openKey);
  document.getElementById("completed").addEventListener("keydown", openKey);

  document.getElementById("detail").addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var button = target.closest("button[data-status]");
    if (!button) return;
    setStatus(button.getAttribute("data-id"), button.getAttribute("data-status"), button);
  });

  document.addEventListener("visibilitychange", function () {
    if (document.hidden) {
      stopTimers();
    } else {
      startTimers();
      load();
    }
  });

  function addLineRow() {
    var row = document.createElement("div");
    row.className = "line-row";
    row.innerHTML =
      '<input class="line-item" type="text" placeholder="Item id" aria-label="Item id" autocomplete="off">' +
      '<input class="line-qty" type="number" min="1" step="1" value="1" aria-label="Qty">' +
      '<input class="line-note" type="text" placeholder="Note" aria-label="Line note" autocomplete="off">' +
      '<button type="button" class="plain line-remove">Remove</button>';
    document.getElementById("cf-lines").appendChild(row);
  }

  document.getElementById("cf-add").addEventListener("click", addLineRow);

  document.getElementById("cf-lines").addEventListener("click", function (event) {
    var target = event.target;
    if (!target || !target.closest) return;
    var remove = target.closest(".line-remove");
    if (!remove) return;
    var row = remove.closest(".line-row");
    if (row && row.parentNode) row.parentNode.removeChild(row);
  });

  function counterKey() {
    var existing = sessionStorage.getItem(KEY_NAME);
    if (existing) return existing;
    var fresh = crypto.randomUUID();
    sessionStorage.setItem(KEY_NAME, fresh);
    return fresh;
  }

  document.getElementById("counter-form").addEventListener("submit", function (event) {
    event.preventDefault();
    var name = document.getElementById("cf-name").value.trim();
    if (!name) {
      counterResult("Enter a name for the order.");
      return;
    }
    var lines = [];
    var rows = document.querySelectorAll("#cf-lines .line-row");
    for (var i = 0; i < rows.length; i++) {
      var itemId = rows[i].querySelector(".line-item").value.trim();
      if (!itemId) continue;
      var qty = parseInt(rows[i].querySelector(".line-qty").value, 10);
      if (!isFinite(qty) || qty < 1) qty = 1;
      lines.push({ id: itemId, qty: qty, note: rows[i].querySelector(".line-note").value.trim() });
    }
    if (!lines.length) {
      counterResult("Add at least one line with an item id.");
      return;
    }
    var key = null;
    try {
      key = counterKey();
    } catch (error) {
      key = null;
    }
    if (!key) {
      counterResult("Could not create a counter key in this browser.");
      return;
    }
    var payload = {
      key: key,
      name: name,
      mobile: document.getElementById("cf-mobile").value.trim(),
      service: document.getElementById("cf-service").value,
      table: document.getElementById("cf-table").value.trim(),
      address: document.getElementById("cf-address").value.trim(),
      note: document.getElementById("cf-note").value.trim(),
      lines: lines
    };
    var place = document.getElementById("cf-place");
    place.disabled = true;
    request("POST", "/api/staff/order", payload).then(function (data) {
      if (halted) return;
      place.disabled = false;
      if (data && data.ok === true && data.order && data.order.id !== null && data.order.id !== undefined) {
        sessionStorage.removeItem(KEY_NAME);
        counterResult("Order placed. New order id: " + String(data.order.id));
        document.getElementById("counter-form").reset();
        var holder = document.getElementById("cf-lines");
        holder.innerHTML = "";
        addLineRow();
        load();
      } else {
        counterResult("The order was not placed. The same counter key will be reused on the next try.");
      }
    }).catch(function () {
      if (halted) return;
      place.disabled = false;
      counterResult("The order could not be posted. The same counter key will be reused on the next try.");
    });
  });

  addLineRow();
  load();
  startTimers();
}());
</script>
</body>
</html>`;
}
