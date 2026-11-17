// Three channels share a shoreline. Scrolling one eases its banks outward,
// faster through the middle than at the top and bottom, until it is the stage.
const stage = document.getElementById("stage");
const channels = [...document.querySelectorAll(".channel")];

// A presentation document, when the present lane has provided one, fills the
// three scrollers before the Events window is located below. Text blocks in
// river.top become scenes; image, mask, and bottom blocks wait for later
// rounds. Without a document the rivers run empty and the loop is unchanged.
const RIVER_SECTIONS = { events: "#events", training: "#training", books: "#products" };

function renderDoc(doc) {
  const rivers = (doc && doc.rivers) || {};
  for (const [river, selector] of Object.entries(RIVER_SECTIONS)) {
    const channel = document.querySelector(selector);
    const scroller = channel && channel.querySelector(".scroller");
    const found = Array.isArray(rivers)
      ? rivers.find((item) => item && item.id === river)
      : rivers[river];
    const top = found && found.top;
    if (!scroller || !Array.isArray(top)) continue;
    let firstScene = true;
    for (const block of top) {
      if (!block || block.type !== "text" || typeof block.text !== "string") continue;
      const article = document.createElement("article");
      article.className = "scene";
      if (block.id) article.id = block.id;
      article.dataset.plate = channel.dataset.plate;
      if (block.x != null) article.dataset.x = String(block.x);
      if (block.y != null) article.dataset.y = String(block.y);
      if (block.w != null) article.dataset.w = String(block.w);
      if (block.h != null) article.dataset.h = String(block.h);
      const copy = document.createElement("div");
      copy.className = "scene-copy";
      const parts = block.text.split("\n\n");
      const eyebrow = document.createElement("span");
      eyebrow.className = "eyebrow";
      const heading = document.createElement("h2");
      let body = "";
      if (parts.length >= 3) {
        eyebrow.textContent = parts[0];
        heading.textContent = parts[1];
        body = parts.slice(2).join("\n\n");
      } else if (parts.length === 2) {
        heading.textContent = parts[0];
        body = parts[1];
      } else {
        heading.textContent = parts[0] || "";
      }
      copy.append(eyebrow, heading);
      if (body) {
        const paragraph = document.createElement("p");
        paragraph.textContent = body;
        copy.append(paragraph);
      }
      article.append(copy);
      if (channel.id === "events" && firstScene) {
        // The Events window keys off .scene-window, so the first scene
        // rendered into that river carries it.
        article.classList.add("scene-window");
      }
      firstScene = false;
      scroller.append(article);
    }
  }
}

// doc.js is a module and may finish after this file. Wait for it, then
// draw once. A second pass would duplicate the scenes.
async function drawSeed() {
  if (!(window.emptyDoc && window.seedDoc)) {
    try {
      await import("../present/doc.js");
    } catch (error) {
      console.warn("Presentation document unavailable.", error);
    }
  }
  if (window.emptyDoc && window.seedDoc) renderDoc(window.seedDoc());
  bindEventsWindow();
}

let events = -1;
let eventsType = [];
const maskKeep = document.querySelector("#events-mask .mask-keep");
const maskHole = document.querySelector("#events-mask .mask-hole");

function bindEventsWindow() {
  events = channels.findIndex((channel) => channel.querySelector(".scene-window"));
  eventsType = events >= 0
    ? [...channels[events].querySelectorAll(".col-head, .scene-copy, .col-end")]
    : [];
}
const portrait = window.matchMedia("(max-width: 800px) and (orientation: portrait)");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

const KNOTS = 9;
const SUBS = 4;
const shown = channels.map(() => 0);
let knots = null;
let anchorX = null;
let hover = 0;
let running = false;

function themeOf(channel) {
  return channel.dataset.theme;
}

function smooth(t) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function progress(channel) {
  const scroller = channel.querySelector(".scroller");
  const max = scroller.scrollHeight - scroller.clientHeight;
  if (max <= 0) return 0;
  return scroller.scrollTop / max;
}

function bulge(yn) {
  const x = (yn - 0.64) / 0.36;
  return Math.exp(-x * x * 1.35);
}

function along(yn, t) {
  const mid = smooth(Math.min(1, t * 1.28));
  const edge = smooth(t);
  return edge + (mid - edge) * bulge(yn);
}

function desiredKnots(leader, t, width) {
  const third = width / 3;
  const rest = [0, third, 2 * third, width];
  const open = leader == null ? rest : [
    [0, width, width, width],
    [0, 0, width, width],
    [0, 0, 0, width],
  ][leader];
  const rows = [];
  for (let k = 0; k < KNOTS; k++) {
    const yn = k / (KNOTS - 1);
    const a = along(yn, t);
    rows.push(rest.map((r, b) => r + (open[b] - r) * a));
  }
  return rows;
}

function catmull(p0, p1, p2, p3, u) {
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * u +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 +
    (-p0 + 3 * p1 - 3 * p2 + p3) * u3
  );
}

function sampleBanks(width, time) {
  const samples = [];
  const last = KNOTS - 1;
  for (let k = 0; k < last; k++) {
    for (let s = 0; s < SUBS; s++) {
      const u = s / SUBS;
      const y = ((k + u) / last);
      const row = [0, 1, 2, 3].map((b) => {
        const i0 = Math.max(0, k - 1);
        const i1 = k;
        const i2 = Math.min(last, k + 1);
        const i3 = Math.min(last, k + 2);
        return catmull(knots[i0][b], knots[i1][b], knots[i2][b], knots[i3][b], u);
      });
      samples.push(wave(row, y, width, time));
    }
  }
  samples.push(wave(knots[last].slice(), 1, width, time));
  return samples;
}

function wave(row, yn, width, time) {
  const span = Math.max(row[3] - row[0], 1);
  const amp = Math.min(11, span * 0.012) * (reduce.matches ? 0 : 1);
  const drift = Math.sin(yn * Math.PI * 1.15 + time * 0.35) * amp
    + Math.sin(yn * Math.PI * 2.4 + time * 0.22) * amp * 0.45;
  return row.map((x, b) => {
    const local = Math.sin(yn * Math.PI * (1.6 + b * 0.15) + time * 0.3 + b) * amp * 0.55;
    return Math.min(width, Math.max(0, x + drift + local));
  });
}

function monotonize(row) {
  for (let b = 1; b < 4; b++) {
    if (row[b] < row[b - 1]) row[b] = row[b - 1];
  }
  return row;
}

function polygon(points) {
  return `polygon(${points.map(([x, y]) => `${x.toFixed(1)}px ${y.toFixed(1)}px`).join(",")})`;
}

function setRect(rect, x, y, w, h) {
  rect.setAttribute("x", x.toFixed(1));
  rect.setAttribute("y", y.toFixed(1));
  rect.setAttribute("width", Math.max(0, w).toFixed(1));
  rect.setAttribute("height", Math.max(0, h).toFixed(1));
}

// The Events river alone carries a window. Its channel keeps one polygon,
// the shoreline; the hole is cut in that river's colour by an SVG mask
// (white keeps the waters, black reveals the portrait behind them). The
// hole belongs to the river, not to any one scene: it spans the part of
// the river on screen, its left edge stays right of whatever type is being
// read, and its right edge follows this river's own bank as the river
// widens, so the portrait grows with the river until it takes the stage.
function cutEventsWindow(banks, lead, t, width, height) {
  if (events < 0 || !maskKeep || !maskHole) return;
  const channel = channels[events];
  const photo = channel.querySelector('.portrait[data-window="portrait"]');
  const india = channel.querySelector('.portrait[data-window="india"]');
  const box = stage.getBoundingClientRect();

  setRect(maskKeep, 0, 0, width, height);

  const y0 = height * 0.12;
  const y1 = height * 0.94;
  if (lead === events && t > 0.02) {
    // The left edge never sits under type: it tracks the widest line of
    // whatever copy is on screen in this river, eased so it slides.
    let target = -Infinity;
    for (const block of eventsType) {
      const r = block.getBoundingClientRect();
      if (r.bottom < box.top + y0 || r.top > box.top + y1) continue;
      const range = document.createRange();
      range.selectNodeContents(block);
      for (const line of range.getClientRects()) {
        target = Math.max(target, line.right - box.left);
      }
    }
    if (target > -Infinity) {
      target += 24;
      anchorX = anchorX == null ? target : anchorX + (target - anchorX) * 0.2;
    }
  }

  let points = "0,0";
  let shot = null;
  if (anchorX != null && anchorX < width - 64) {
    // Right edge: this river's own bank at each row of the hole, so the
    // photo is bounded by the shoreline. While the river is narrow there
    // is no room and the hole has no size; as the river opens the hole
    // grows across the right of the stage with the bank.
    const rows = [];
    let sLo = -1;
    let sHi = -1;
    let rightMax = 0;
    banks.forEach((row, s) => {
      const y = (s / (banks.length - 1)) * height;
      if (y < y0 || y > y1) return;
      const right = row[events + 1] - 8;
      if (right - anchorX < 24) return;
      if (sLo < 0) sLo = s;
      sHi = s;
      rightMax = Math.max(rightMax, right);
      rows.push([Math.max(right, anchorX), y]);
    });
    if (sLo >= 0) {
      const yLo = (sLo / (banks.length - 1)) * height;
      const yHi = (sHi / (banks.length - 1)) * height;
      const shape = [[anchorX, yLo], [anchorX, yHi]].concat(rows.slice().reverse());
      points = shape.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
      shot = {
        left: anchorX - 1,
        top: yLo - 1,
        width: rightMax - anchorX + 2,
        height: yHi - yLo + 2,
      };
    }
  }

  maskHole.setAttribute("points", points);

  // Further down the Events scroll the standing portrait gives way to a
  // second photograph. It rides the same window and the same bounds, so it
  // can never appear in a neighbouring river. It fades in over the standing
  // portrait (photo onto photo, no scrim) and, unlike the content, it is
  // fixed to the page: clipped in place each frame, never scrolled.
  const along = progress(channel);
  const shift = smooth(Math.min(1, Math.max(0, (along - 0.55) / 0.3)));

  if (india) {
    if (shot) {
      const inset = [
        shot.top,
        width - (shot.left + shot.width),
        height - (shot.top + shot.height),
        shot.left,
      ].map((v) => `${Math.max(0, v).toFixed(1)}px`).join(" ");
      india.style.clipPath = `inset(${inset})`;
      india.style.opacity = shift.toFixed(3);
    } else {
      india.style.clipPath = "";
      india.style.opacity = "";
    }
  }

  if (photo) {
    if (shot) {
      photo.style.clipPath = "none";
      photo.style.left = `${shot.left.toFixed(1)}px`;
      photo.style.top = `${shot.top.toFixed(1)}px`;
      photo.style.width = `${shot.width.toFixed(1)}px`;
      photo.style.height = `${shot.height.toFixed(1)}px`;
    } else {
      // No hole, no size: the portrait falls back to its hidden clip.
      photo.style.clipPath = "";
      photo.style.left = "";
      photo.style.top = "";
      photo.style.width = "";
      photo.style.height = "";
    }
  }
}

function plateFor(channel) {
  const scroller = channel.querySelector(".scroller");
  const scenes = [...scroller.querySelectorAll(".scene")];
  const box = scroller.getBoundingClientRect();
  const line = box.top + box.height * 0.58;
  let best = null;
  let bestDist = Infinity;
  for (const scene of scenes) {
    const r = scene.getBoundingClientRect();
    if (r.bottom < box.top || r.top > box.bottom) continue;
    const dist = Math.abs(r.top + r.height * 0.35 - line);
    if (dist < bestDist) {
      best = scene;
      bestDist = dist;
    }
  }
  return best ? best.dataset.plate : channel.dataset.plate;
}

function showColumn(theme) {
  for (const channel of channels) {
    channel.classList.toggle("is-shown", themeOf(channel) === theme);
  }
  for (const button of document.querySelectorAll(".pager button")) {
    button.setAttribute("aria-pressed", button.dataset.go === theme ? "true" : "false");
  }
}

function plainLayout() {
  stage.classList.remove("is-river");
  anchorX = null;
  if (maskHole) maskHole.setAttribute("points", "0,0");
  for (const channel of channels) {
    channel.style.clipPath = "";
    channel.style.opacity = "";
    channel.style.filter = "";
    channel.style.zIndex = "";
    for (const photo of channel.querySelectorAll(".portrait")) {
      photo.style.clipPath = "";
      photo.style.opacity = "";
      photo.style.left = "";
      photo.style.top = "";
      photo.style.width = "";
      photo.style.height = "";
    }
    const scroller = channel.querySelector(".scroller");
    scroller.style.left = "";
    scroller.style.width = "";
    scroller.style.right = "";
  }
}

function frame(time) {
  if (!running) return;
  if (portrait.matches || reduce.matches) {
    plainLayout();
    running = false;
    return;
  }
  stage.classList.add("is-river");

  const width = stage.clientWidth;
  const height = stage.clientHeight;
  if (width < 2 || height < 2) {
    requestAnimationFrame(frame);
    return;
  }

  let leader = 0;
  for (let i = 0; i < channels.length; i++) {
    const target = smooth(progress(channels[i]));
    shown[i] += (target - shown[i]) * 0.085;
    if (shown[i] > shown[leader]) leader = i;
  }
  const lead = shown[leader] > 0.012 ? leader : null;
  const t = lead == null ? 0 : shown[leader];
  const want = desiredKnots(lead, t, width);
  if (!knots) knots = want.map((row) => row.slice());
  for (let k = 0; k < KNOTS; k++) {
    for (let b = 0; b < 4; b++) knots[k][b] += (want[k][b] - knots[k][b]) * 0.14;
  }

  const banks = sampleBanks(width, time / 1000).map(monotonize);
  const heightPx = height;

  channels.forEach((channel, i) => {
    const left = [];
    const right = [];
    let narrowL = 0;
    let narrowR = width;
    banks.forEach((row, s) => {
      const yn = s / (banks.length - 1);
      const y = yn * heightPx;
      left.push([row[i], y]);
      right.push([row[i + 1], y]);
      if (yn > 0.68) {
        if (row[i] > narrowL) narrowL = row[i];
        if (row[i + 1] < narrowR) narrowR = row[i + 1];
      }
    });
    // The channel is clipped to its shoreline and to nothing else: exactly
    // one polygon, set once the shoreline points are known.
    channel.style.clipPath = polygon(left.concat(right.reverse()));
    const span = Math.max(0, narrowR - narrowL);
    const pad = Math.min(28, span * 0.06);
    const scroller = channel.querySelector(".scroller");
    scroller.style.left = `${(narrowL + pad).toFixed(1)}px`;
    scroller.style.width = `${Math.max(0, span - pad * 2).toFixed(1)}px`;
    // Rest is brightness 1. The lane being read only rises from there.
    // The others fall on the same curve.
    const rise = smooth(Math.min(1, t * 1.6));
    const bright = lead == null ? 1 : (i === lead ? 1 : Math.max(0, 1 - rise));
    channel.style.opacity = String(span < 8 ? 0 : Math.min(1, bright));
    const level = lead == null ? 1 : (i === lead ? 1 + 0.22 * rise : 1 - 0.45 * rise);
    channel.style.filter = `brightness(${level.toFixed(3)})`;
    const hot = i === hover ? 3 : i === lead ? 2 : 1;
    channel.style.zIndex = String(hot);
    const plate = plateFor(channel);
    if (plate && channel.dataset.plate !== plate) channel.dataset.plate = plate;
  });

  cutEventsWindow(banks, lead, t, width, height);

  requestAnimationFrame(frame);
}

function ensure() {
  if (portrait.matches || reduce.matches) {
    plainLayout();
    if (portrait.matches) {
      const shownCol = channels.find((channel) => channel.classList.contains("is-shown"));
      showColumn(shownCol ? themeOf(shownCol) : "body");
    }
    return;
  }
  for (const channel of channels) channel.classList.remove("is-shown");
  if (!running) {
    running = true;
    knots = null;
    requestAnimationFrame(frame);
  }
}

// Anchors: each scene has a short id. On load, a hash naming an element
// inside a river scrolls that river so the element sits near its top.
// While a river is read, the hash follows the scene closest to the top
// of that river, by replaceState only, so a bookmark keeps the place
// without pushing a history entry per scene.
function nearestScene(channel) {
  const scroller = channel.querySelector(".scroller");
  const box = scroller.getBoundingClientRect();
  let best = null;
  let bestDist = Infinity;
  for (const scene of scroller.querySelectorAll(".scene")) {
    const r = scene.getBoundingClientRect();
    const dist = Math.abs(r.top - box.top);
    if (dist < bestDist) {
      best = scene;
      bestDist = dist;
    }
  }
  return best;
}

function trackPlace(channel) {
  const scene = nearestScene(channel);
  if (!scene || !scene.id) return;
  const want = "#" + scene.id;
  if (location.hash !== want) history.replaceState(null, "", want);
}

function applyHash() {
  const id = decodeURIComponent(location.hash.slice(1));
  if (!id) return;
  const el = document.getElementById(id);
  if (!el) return;
  const scroller = el.closest(".scroller");
  if (!scroller) return;
  const sBox = scroller.getBoundingClientRect();
  const eBox = el.getBoundingClientRect();
  scroller.scrollTop += eBox.top - sBox.top - 8;
}

for (const channel of channels) {
  channel.querySelector(".scroller").addEventListener("scroll", () => {
    hover = channels.indexOf(channel);
    trackPlace(channel);
  }, { passive: true });
  channel.addEventListener("pointerenter", () => {
    hover = channels.indexOf(channel);
  });
}

stage.addEventListener("pointermove", (event) => {
  if (portrait.matches) return;
  const width = stage.clientWidth || 1;
  hover = Math.min(2, Math.floor((event.clientX / width) * 3));
});

document.getElementById("pager").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  showColumn(button.dataset.go);
});

portrait.addEventListener("change", ensure);
reduce.addEventListener("change", ensure);
drawSeed().then(() => {
  applyHash();
  ensure();
});
