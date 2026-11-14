// Three channels share a shoreline. Scrolling one eases its banks outward,
// faster through the middle than at the top and bottom, until it is the stage.
const stage = document.getElementById("stage");
const channels = [...document.querySelectorAll(".channel")];
const portrait = window.matchMedia("(max-width: 800px) and (orientation: portrait)");
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

const KNOTS = 9;
const SUBS = 4;
const shown = channels.map(() => 0);
let knots = null;
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
  for (const channel of channels) {
    channel.style.clipPath = "";
    channel.style.opacity = "";
    channel.style.filter = "";
    channel.style.zIndex = "";
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
    const shape = left.concat(right.reverse());
    channel.style.clipPath = polygon(shape);
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

for (const channel of channels) {
  channel.querySelector(".scroller").addEventListener("scroll", () => {
    hover = channels.indexOf(channel);
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
ensure();
