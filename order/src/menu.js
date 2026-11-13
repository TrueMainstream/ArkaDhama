// Customer menu page for Arka Dhama. One HTML document, inline CSS and script.

export function menuHtml() {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Menu · Arka Dhama</title>
<style>
* { box-sizing: border-box; }
[hidden] { display: none !important; }
body {
  margin: 0;
  background: #fbf7f0;
  color: #241f16;
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: 16px;
  line-height: 1.55;
}
h1, h2, h3 { font-family: Georgia, 'Times New Roman', serif; font-weight: 600; line-height: 1.25; margin: 0; }
a { color: #8c6a2f; }
.wrap { max-width: 920px; margin: 0 auto; padding: 20px 20px 72px; }
.banner { margin: 0; padding: 10px 16px; background: #f2ead9; border-bottom: 1px solid #e4dccb; color: #6f675b; text-align: center; font-size: 14px; }
.site-header { display: flex; flex-wrap: wrap; align-items: baseline; gap: 6px 16px; padding: 14px 0; border-bottom: 1px solid #e4dccb; }
.site-header h1 { font-size: 32px; }
.signin { margin: 0 0 0 auto; font-size: 15px; }
.staff-note { flex-basis: 100%; margin: 0; color: #6f675b; font-size: 14px; }
.status { margin: 0; padding: 20px 0; color: #6f675b; }
.closed-note { margin: 16px 0 0; padding: 10px 14px; background: #f2ead9; border: 1px solid #e4dccb; border-radius: 10px; font-weight: 600; }
.columns { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); gap: 32px; align-items: start; padding-top: 20px; }
.category { margin-bottom: 26px; }
.category h2 { font-size: 21px; padding-bottom: 6px; border-bottom: 1px solid #e4dccb; }
.items { list-style: none; margin: 14px 0 0; padding: 0; display: grid; gap: 12px; }
.item { display: grid; grid-template-columns: 64px minmax(0, 1fr) auto; grid-template-areas: 'photo body actions'; gap: 12px; align-items: start; background: #fffdf8; border: 1px solid #e4dccb; border-radius: 12px; padding: 12px 14px; }
.item.no-photo { grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: 'body actions'; }
.item-photo { grid-area: photo; width: 64px; height: 64px; object-fit: cover; border: 1px solid #e4dccb; border-radius: 8px; }
.item-body { grid-area: body; min-width: 0; }
.item-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.item-head h3 { font-size: 17px; }
.item.sold-out .item-head h3, .item.sold-out .price, .item.sold-out .item-desc { color: #6f675b; }
.price { white-space: nowrap; font-variant-numeric: tabular-nums; }
.item-desc { margin: 4px 0 0; color: #6f675b; font-size: 14px; }
.item-actions { grid-area: actions; display: flex; align-items: center; }
.soldout-badge { color: #6f675b; border: 1px dashed #e4dccb; border-radius: 999px; padding: 5px 12px; font-size: 13px; white-space: nowrap; }
button { font: inherit; cursor: pointer; }
.add-btn { background: transparent; color: #8c6a2f; border: 1px solid #8c6a2f; border-radius: 8px; padding: 8px 16px; }
.add-btn:hover { background: #8c6a2f; color: #fbf7f0; }
.order-panel { background: #fffdf8; border: 1px solid #e4dccb; border-radius: 12px; padding: 18px; position: sticky; top: 16px; }
.order-panel h2 { font-size: 20px; }
.cart-empty { margin: 4px 0 12px; color: #6f675b; font-size: 14px; }
.cart-line { padding: 12px 0; border-bottom: 1px solid #e4dccb; }
.cart-line-head { display: flex; justify-content: space-between; gap: 10px; }
.cart-line-name { font-weight: 600; }
.cart-line-total { white-space: nowrap; font-variant-numeric: tabular-nums; }
.cart-line-controls { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.qty { min-width: 18px; text-align: center; font-variant-numeric: tabular-nums; }
.qty-btn { width: 32px; height: 32px; border-radius: 8px; border: 1px solid #e4dccb; background: #fbf7f0; color: #241f16; }
.qty-btn:hover { border-color: #8c6a2f; color: #8c6a2f; }
.line-remove { margin-left: auto; background: transparent; border: none; padding: 4px 0; color: #6f675b; text-decoration: underline; }
.line-remove:hover { color: #8c6a2f; }
.line-note { margin-top: 8px; }
.cart-subtotal { display: flex; justify-content: space-between; margin: 12px 0 0; font-weight: 600; }
input { font: inherit; color: #241f16; background: #fbf7f0; border: 1px solid #e4dccb; border-radius: 8px; padding: 9px 12px; width: 100%; }
input:focus { outline: 2px solid #8c6a2f; outline-offset: 1px; }
fieldset { margin: 16px 0; border: 1px solid #e4dccb; border-radius: 10px; padding: 10px 12px 12px; }
legend { padding: 0 6px; font-size: 14px; color: #6f675b; }
.radio { display: inline-flex; align-items: center; gap: 6px; margin: 4px 14px 4px 0; }
.radio input { width: auto; accent-color: #8c6a2f; }
.field { margin-bottom: 12px; }
.field label { display: block; font-size: 14px; margin-bottom: 4px; }
.opt { color: #6f675b; font-size: 13px; }
.place-btn { width: 100%; margin-top: 6px; background: #8c6a2f; color: #fbf7f0; border: 1px solid #8c6a2f; border-radius: 8px; padding: 12px 16px; font-size: 16px; }
.place-btn:hover:not(:disabled) { background: #7a5b27; }
.place-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.form-msg { margin: 10px 0 0; font-size: 14px; color: #6f675b; }
.form-msg.is-error { color: #8c3b2e; }
.receipt { max-width: 540px; margin: 28px auto 0; background: #fffdf8; border: 1px solid #e4dccb; border-radius: 12px; padding: 22px; }
.receipt h2 { font-size: 22px; }
.order-id { margin: 6px 0 14px; color: #6f675b; }
.repeat-note { margin: 0 0 14px; padding: 9px 12px; background: #f2ead9; border: 1px solid #e4dccb; border-radius: 8px; font-size: 14px; }
.receipt-table { width: 100%; border-collapse: collapse; }
.receipt-table td { padding: 8px 0; border-bottom: 1px solid #e4dccb; font-size: 15px; vertical-align: top; }
.receipt-table td:nth-child(2) { padding-left: 14px; padding-right: 14px; color: #6f675b; white-space: nowrap; }
.receipt-table td:nth-child(3) { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.receipt-table tr.sum td { border-bottom: none; }
.receipt-table tr.total-row td { border-bottom: none; border-top: 1px solid #241f16; font-weight: 700; }
@media (max-width: 640px) {
  .wrap { padding-left: 16px; padding-right: 16px; }
  .columns { grid-template-columns: minmax(0, 1fr); gap: 24px; }
  .order-panel { position: static; }
  .item { grid-template-columns: 56px minmax(0, 1fr); grid-template-areas: 'photo body' 'actions actions'; }
  .item.no-photo { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'body' 'actions'; }
  .item-photo { width: 56px; height: 56px; }
  .item-actions { margin-top: 10px; }
  input:not([type='radio']), button { min-height: 44px; }
  .qty-btn { width: 44px; height: 44px; }
  .radio { display: flex; width: 100%; margin: 4px 0; }
}
</style>
</head>
<body>
<p class="banner">Prototype. Payment is recorded here and is not yet charged by Razorpay. A real card is not taken on this page.</p>
<div class="wrap">
  <header class="site-header">
    <h1>Arka Dhama</h1>
    <p class="signin"><a href="/login">Sign in</a></p>
    <p class="staff-note">Staff use <a href="/staff">/staff</a>. A customer does not need an account.</p>
  </header>
  <main>
    <p id="closed-note" class="closed-note" hidden>Ordering is closed</p>
    <p id="menu-status" class="status">Loading the menu…</p>
    <div id="columns" class="columns">
      <section aria-label="Menu">
        <div id="menu"></div>
      </section>
      <section class="order-panel" aria-label="Your order">
        <h2>Your order</h2>
        <div id="cart"></div>
        <form id="order-form">
          <fieldset>
            <legend>Service</legend>
            <label class="radio"><input type="radio" name="service" value="dine_in" checked> Dine in</label>
            <label class="radio"><input type="radio" name="service" value="takeaway"> Takeaway</label>
            <label class="radio" id="delivery-option" hidden><input type="radio" name="service" value="delivery"> Delivery</label>
          </fieldset>
          <div class="field" id="table-field">
            <label for="f-table">Table <span class="opt">(optional)</span></label>
            <input id="f-table" type="text" autocomplete="off" placeholder="I'll find a seat">
          </div>
          <div class="field" id="address-field" hidden>
            <label for="f-address">Address</label>
            <input id="f-address" type="text" autocomplete="street-address" placeholder="Where should we deliver?">
          </div>
          <div class="field">
            <label for="f-name">Name</label>
            <input id="f-name" type="text" autocomplete="name" required>
          </div>
          <div class="field">
            <label for="f-phone">Mobile</label>
            <input id="f-phone" type="tel" inputmode="tel" autocomplete="tel" required>
          </div>
          <div class="field">
            <label for="f-note">Order note <span class="opt">(optional)</span></label>
            <input id="f-note" type="text">
          </div>
          <button id="place-btn" type="submit" class="place-btn">Place order</button>
          <p id="form-msg" class="form-msg" aria-live="polite"></p>
        </form>
      </section>
    </div>
    <section id="receipt" class="receipt" hidden></section>
  </main>
</div>
<script>
(function () {
  'use strict';

  var menuStatusEl = document.getElementById('menu-status');
  var menuEl = document.getElementById('menu');
  var cartEl = document.getElementById('cart');
  var columnsEl = document.getElementById('columns');
  var receiptEl = document.getElementById('receipt');
  var formEl = document.getElementById('order-form');
  var nameInput = document.getElementById('f-name');
  var phoneInput = document.getElementById('f-phone');
  var tableInput = document.getElementById('f-table');
  var addressInput = document.getElementById('f-address');
  var orderNoteInput = document.getElementById('f-note');
  var tableFieldEl = document.getElementById('table-field');
  var addressFieldEl = document.getElementById('address-field');
  var deliveryOptionEl = document.getElementById('delivery-option');
  var closedNoteEl = document.getElementById('closed-note');
  var placeBtnEl = document.getElementById('place-btn');
  var formMsgEl = document.getElementById('form-msg');

  var state = {
    items: {},
    byCategory: {},
    categories: [],
    settings: {},
    service: 'dine_in',
    order: []
  };

  function esc(value) {
    return String(value === undefined || value === null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function toNumber(value) {
    var n = Number(value);
    return isNaN(n) ? 0 : n;
  }

  function flagOn(value) {
    return Number(value) === 1;
  }

  function money(paise) {
    return '₹' + (toNumber(paise) / 100).toLocaleString('en-IN');
  }

  function setMsg(text, isError) {
    formMsgEl.textContent = text;
    formMsgEl.className = isError ? 'form-msg is-error' : 'form-msg';
  }

  function subtotal() {
    var sum = 0;
    for (var i = 0; i < state.order.length; i++) {
      var item = state.items[state.order[i].id];
      if (item) sum += toNumber(item.price) * state.order[i].qty;
    }
    return sum;
  }

  function itemHtml(item) {
    var soldOut = Number(item.available) === 0;
    var hasPhoto = typeof item.photoUrl === 'string' && item.photoUrl.indexOf('/media/') === 0;
    var cls = 'item' + (hasPhoto ? '' : ' no-photo') + (soldOut ? ' sold-out' : '');
    var html = '<li class="' + cls + '">';
    if (hasPhoto) {
      html += '<img class="item-photo" src="' + esc(item.photoUrl) + '" alt="' + esc(item.name) + '" loading="lazy">';
    }
    html += '<div class="item-body">';
    html += '<div class="item-head"><h3>' + esc(item.name) + '</h3><span class="price">' + money(item.price) + '</span></div>';
    if (item.description) {
      html += '<p class="item-desc">' + esc(item.description) + '</p>';
    }
    html += '</div>';
    html += '<div class="item-actions">';
    if (soldOut) {
      html += '<span class="soldout-badge">Sold out</span>';
    } else {
      html += '<button type="button" class="add-btn" data-id="' + esc(item.id) + '">Add</button>';
    }
    html += '</div></li>';
    return html;
  }

  function renderMenu() {
    var html = '';
    for (var c = 0; c < state.categories.length; c++) {
      var category = state.categories[c];
      var items = state.byCategory[category.id] || [];
      if (!items.length) continue;
      html += '<section class="category"><h2>' + esc(category.name) + '</h2><ul class="items">';
      for (var i = 0; i < items.length; i++) {
        html += itemHtml(items[i]);
      }
      html += '</ul></section>';
    }
    menuEl.innerHTML = html;
  }

  function findLine(id) {
    for (var i = 0; i < state.order.length; i++) {
      if (state.order[i].id === id) return state.order[i];
    }
    return null;
  }

  function renderCart() {
    if (!state.order.length) {
      cartEl.innerHTML = '<p class="cart-empty">Nothing added yet.</p>';
      return;
    }
    var html = '';
    for (var i = 0; i < state.order.length; i++) {
      var line = state.order[i];
      var item = state.items[line.id] || {};
      html += '<div class="cart-line" data-id="' + esc(line.id) + '">';
      html += '<div class="cart-line-head"><span class="cart-line-name">' + esc(item.name) + '</span>';
      html += '<span class="cart-line-total">' + money(toNumber(item.price) * line.qty) + '</span></div>';
      html += '<div class="cart-line-controls">';
      html += '<button type="button" class="qty-btn" data-act="dec" aria-label="One less">-</button>';
      html += '<span class="qty">' + line.qty + '</span>';
      html += '<button type="button" class="qty-btn" data-act="inc" aria-label="One more">+</button>';
      html += '<button type="button" class="line-remove" data-act="remove">Remove</button>';
      html += '</div>';
      html += '<input class="line-note" type="text" placeholder="no onion" aria-label="Note for this item" value="' + esc(line.note) + '">';
      html += '</div>';
    }
    html += '<p class="cart-subtotal"><span>Subtotal</span><span>' + money(subtotal()) + '</span></p>';
    cartEl.innerHTML = html;
  }

  function addToCart(id) {
    var line = findLine(id);
    if (line) {
      line.qty += 1;
    } else {
      state.order.push({ id: id, qty: 1, note: '' });
    }
    renderCart();
  }

  menuEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.add-btn');
    if (!btn) return;
    addToCart(btn.getAttribute('data-id'));
  });

  cartEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button');
    if (!btn) return;
    var wrap = e.target.closest('.cart-line');
    if (!wrap) return;
    var line = findLine(wrap.getAttribute('data-id'));
    if (!line) return;
    var act = btn.getAttribute('data-act');
    if (act === 'inc') line.qty += 1;
    if (act === 'dec') line.qty -= 1;
    if (act === 'remove') line.qty = 0;
    if (line.qty <= 0) {
      var idx = state.order.indexOf(line);
      if (idx >= 0) state.order.splice(idx, 1);
    }
    renderCart();
  });

  cartEl.addEventListener('input', function (e) {
    var input = e.target.closest('.line-note');
    if (!input) return;
    var wrap = input.closest('.cart-line');
    var line = wrap ? findLine(wrap.getAttribute('data-id')) : null;
    if (line) line.note = input.value;
  });

  function applyService() {
    var checked = formEl.querySelector('input[name="service"]:checked');
    state.service = checked ? checked.value : 'dine_in';
    tableFieldEl.hidden = state.service !== 'dine_in';
    addressFieldEl.hidden = state.service !== 'delivery';
    addressInput.required = state.service === 'delivery';
  }

  var serviceRadios = formEl.querySelectorAll('input[name="service"]');
  for (var r = 0; r < serviceRadios.length; r++) {
    serviceRadios[r].addEventListener('change', applyService);
  }

  formEl.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!flagOn(state.settings.orderingOpen)) {
      setMsg('Ordering is closed', true);
      return;
    }
    if (!state.order.length) {
      setMsg('Add at least one item from the menu.', true);
      return;
    }
    var name = nameInput.value.trim();
    var phone = phoneInput.value.trim();
    if (!name) {
      setMsg('Please add your name.', true);
      nameInput.focus();
      return;
    }
    if (!phone) {
      setMsg('Please add your mobile number.', true);
      phoneInput.focus();
      return;
    }
    var table = '';
    var address = '';
    if (state.service === 'dine_in') table = tableInput.value.trim();
    if (state.service === 'delivery') {
      address = addressInput.value.trim();
      if (!address) {
        setMsg('Please add a delivery address.', true);
        addressInput.focus();
        return;
      }
    }

    var key = null;
    try {
      key = sessionStorage.getItem('arka-order-key');
    } catch (storageError) {
      key = null;
    }
    if (!key) {
      key = crypto.randomUUID();
      try {
        sessionStorage.setItem('arka-order-key', key);
      } catch (storageError2) {}
    }

    var lines = [];
    for (var i = 0; i < state.order.length; i++) {
      lines.push({
        itemId: state.order[i].id,
        qty: state.order[i].qty,
        note: state.order[i].note
      });
    }

    placeBtnEl.disabled = true;
    setMsg('Placing your order…', false);

    fetch('/api/order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        key: key,
        name: name,
        phone: phone,
        service: state.service,
        table: table,
        address: address,
        note: orderNoteInput.value.trim(),
        lines: lines
      })
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        if (data && data.ok === true) {
          try {
            sessionStorage.removeItem('arka-order-key');
          } catch (storageError3) {}
          showReceipt(data);
          return;
        }
        placeBtnEl.disabled = false;
        setMsg(data && data.error ? String(data.error) : 'The order could not be placed. Please try again.', true);
      })
      .catch(function () {
        placeBtnEl.disabled = false;
        setMsg('The order could not be placed. Please try again.', true);
      });
  });

  function showReceipt(data) {
    var order = data.order || {};
    var lines = Array.isArray(order.lines) ? order.lines : [];
    var html = '<h2>Order placed</h2>';
    html += '<p class="order-id">Order ' + esc(order.id) + '</p>';
    if (data.repeat === true) {
      html += '<p class="repeat-note">This is the order already placed.</p>';
    }
    html += '<table class="receipt-table"><tbody>';
    for (var i = 0; i < lines.length; i++) {
      html += '<tr><td>' + esc(lines[i].name) + '</td><td>' + esc(lines[i].qty) + '</td><td>' + money(lines[i].total) + '</td></tr>';
    }
    html += '<tr class="sum"><td>Subtotal</td><td></td><td>' + money(order.subtotal) + '</td></tr>';
    html += '<tr class="sum"><td>Tax</td><td></td><td>' + money(order.tax) + '</td></tr>';
    html += '<tr class="total-row"><td>Total</td><td></td><td>' + money(order.total) + '</td></tr>';
    html += '</tbody></table>';
    receiptEl.innerHTML = html;
    receiptEl.hidden = false;
    columnsEl.hidden = true;
    closedNoteEl.hidden = true;
    state.order = [];
    setMsg('', false);
    if (receiptEl.scrollIntoView) {
      receiptEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function onMenu(data) {
    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.items)) {
      menuStatusEl.textContent = 'The menu could not be loaded. Please refresh the page.';
      return;
    }
    state.settings = data.settings || {};
    state.items = Object.create(null);
    state.byCategory = Object.create(null);
    for (var i = 0; i < data.items.length; i++) {
      var item = data.items[i];
      state.items[item.id] = item;
      if (!state.byCategory[item.categoryId]) state.byCategory[item.categoryId] = [];
      state.byCategory[item.categoryId].push(item);
    }
    state.categories = data.categories.slice().sort(function (a, b) {
      return toNumber(a.sort) - toNumber(b.sort);
    });
    for (var key in state.byCategory) {
      if (Object.prototype.hasOwnProperty.call(state.byCategory, key)) {
        state.byCategory[key].sort(function (a, b) {
          return toNumber(a.sort) - toNumber(b.sort);
        });
      }
    }

    if (flagOn(state.settings.deliveryEnabled)) {
      deliveryOptionEl.hidden = false;
    }
    if (!flagOn(state.settings.orderingOpen)) {
      closedNoteEl.hidden = false;
      placeBtnEl.disabled = true;
    }
    applyService();
    renderMenu();
    renderCart();
    menuStatusEl.hidden = true;
  }

  fetch('/api/menu')
    .then(function (r) {
      if (!r.ok) throw new Error('menu request failed');
      return r.json();
    })
    .then(onMenu)
    .catch(function () {
      menuStatusEl.textContent = 'The menu could not be loaded. Please refresh the page.';
    });
})();
</script>
</body>
</html>`;
}
