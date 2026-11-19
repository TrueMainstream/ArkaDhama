// The river editor, desktop only. On load it takes the live document from
// the worker, or the seed copy when nothing has been saved yet, and edits
// that copy in memory. Save writes the copy back; Revert and a restore
// from History replace it with an earlier revision.
//
// Three rivers are editable — Events, Training, Books — out of the nine
// the document carries. One canvas shows the selected river. The tabs at
// the foot of the page switch which layer of that same canvas is showing,
// the way a spreadsheet switches sheets. A mask exists only on the top
// layer, and it is a hole onto the still layer at the same place. An event
// block may sit on either layer; the canvas draws it as a labelled
// rectangle, and fetching the posts stays the public page's job.
// Placement is by percentage fields. There is no drag.

const RIVER_NAMES = [
  ["events", "Events"],
  ["training", "Training"],
  ["books", "Books"],
];

const FONTS = ["Georgia", "Palatino", "system-ui"];
const FONT_SIZES = ["1rem", "1.4rem", "2.2rem", "3.4rem"];
const FONT_COLORS = [
  ["Cream", "#f4efe6"],
  ["Navy", "#002040"],
  ["Gold", "#6a4e12"],
];

const DEFAULT_FONT = "Georgia";
const DEFAULT_FONT_SIZE = "1.4rem";
const DEFAULT_FONT_COLOR = "#f4efe6";

let doc = null;
let riverId = "training"; // the centre river opens selected
let layer = "top"; // the pane the tabs have chosen for new blocks
let selectedId = null;
let boardEvents = null; // { upcoming, past } from the events board, or null while loading

const riversNav = document.getElementById("rivers");
const pane = document.getElementById("pane");
const paneLabel = document.getElementById("pane-label");
const fieldsBox = document.getElementById("block-fields");
const addMaskButton = document.getElementById("add-mask");
const deleteButton = document.getElementById("delete-selected");
const saveButton = document.getElementById("save");
const publishButton = document.getElementById("publish");
const revertButton = document.getElementById("revert");
const historyButton = document.getElementById("history");
const statusLine = document.getElementById("status");
const historyBox = document.getElementById("history-list");

function currentRiver() {
  return doc.rivers.find((river) => river.id === riverId);
}

function findSelected() {
  const river = currentRiver();
  for (const key of ["top", "bottom"]) {
    const block = river[key].find((item) => item.id === selectedId);
    if (block) return block;
  }
  return null;
}

// ---- The one canvas -----------------------------------------------------

function drawPanes() {
  const river = currentRiver();
  pane.style.background = river.color;
  paneLabel.textContent = layer === "top" ? "Top layer" : "Still layer";
  pane.replaceChildren();
  const blocks = layer === "top" ? river.top : river.bottom;
  for (const block of blocks) {
    if (block.type === "mask" && layer !== "top") continue;
    pane.append(blockElement(block));
  }
  // On the top layer a mask is a hole onto this river's still layer, at
  // the same place. The other layer is not a second page underneath.
  if (layer === "top") drawMaskReveals(river);
  fitPane();
}

// The pane starts at 1400px. A block whose text runs past that edge was
// clipped, and the lane could not scroll to it because the pane itself
// ended. Grow the pane to the lowest block, with room under the last line.
function fitPane() {
  let bottom = 1400;
  for (const block of pane.querySelectorAll(".block")) {
    const end = block.offsetTop + block.offsetHeight;
    if (end + 48 > bottom) bottom = end + 48;
  }
  pane.style.height = `${bottom}px`;
}

function drawMaskReveals(river) {
  for (const mask of river.top) {
    if (mask.type !== "mask") continue;
    const reveal = document.createElement("div");
    reveal.className = "mask-reveal";
    reveal.style.clipPath =
      `inset(${mask.y}% ${100 - mask.x - mask.w}% ${100 - mask.y - mask.h}% ${mask.x}%)`;
    for (const block of river.bottom) {
      if (block.type === "mask") continue;
      const copy = blockElement(block);
      copy.classList.add("is-revealed");
      reveal.append(copy);
    }
    pane.append(reveal);
  }
}

function blockElement(block) {
  const el = document.createElement("div");
  el.className = `block is-${block.type}` + (block.id === selectedId ? " is-selected" : "");
  el.style.left = `${block.x}%`;
  el.style.top = `${block.y}%`;
  el.style.width = `${block.w}%`;
  if (block.type === "text") {
    // A text block takes its h as a floor, never a clip: min-height from
    // h, height auto, so a paragraph grows instead of being cut.
    el.textContent = block.text;
    el.style.fontFamily = block.font || DEFAULT_FONT;
    el.style.fontSize = block.fontSize || DEFAULT_FONT_SIZE;
    el.style.color = block.fontColor || DEFAULT_FONT_COLOR;
    el.style.minHeight = `${block.h}%`;
  } else {
    el.style.height = `${block.h}%`;
    if (block.type === "image") {
      el.style.backgroundImage = `url("${block.src}")`;
    } else if (block.type === "mask") {
      const tag = document.createElement("span");
      tag.className = "mask-tag";
      tag.textContent = "Mask";
      el.append(tag);
    } else if (block.type === "event") {
      // A window onto the events board, placed like an image. The posts
      // are filled in once the board list has loaded. Posting stays on
      // the board.
      el.style.border = "2px solid #f4efe6";
      el.style.overflow = "auto";
      el.style.padding = "8px 10px";
      const tag = document.createElement("span");
      tag.className = "mask-tag";
      tag.textContent = `Events · ${block.show}`;
      const list = document.createElement("div");
      list.className = "event-posts";
      fillEventWindow(list, block);
      el.append(tag, list);
    }
  }
  el.title = block.id;
  el.addEventListener("click", (event) => {
    event.stopPropagation();
    if (selectedId === block.id) return;
    selectedId = block.id;
    drawPanes();
    drawFields();
  });
  return el;
}

pane.addEventListener("click", () => {
  if (selectedId === null) return;
  selectedId = null;
  drawPanes();
  drawFields();
});

// ---- The side panel -----------------------------------------------------

function drawFields() {
  fieldsBox.replaceChildren();
  const block = findSelected();
  deleteButton.disabled = block === null;
  if (block === null) {
    const none = document.createElement("p");
    none.className = "hint";
    none.textContent = "No block selected. Click a block in either pane.";
    fieldsBox.append(none);
    return;
  }

  const kind = document.createElement("p");
  kind.className = "hint";
  kind.textContent = `${block.type} · ${block.id}`;
  fieldsBox.append(kind);

  const geo = document.createElement("div");
  geo.className = "geo";
  for (const field of ["x", "y", "w", "h"]) geo.append(numberField(block, field));
  fieldsBox.append(geo);

  if (block.type === "text") fieldsBox.append(textFields(block));
  if (block.type === "image") fieldsBox.append(srcField(block));
  if (block.type === "event") fieldsBox.append(eventFields(block));
  fieldsBox.append(hrefField(block));
}

function fieldRow(label, control) {
  const row = document.createElement("label");
  row.className = "field";
  const name = document.createElement("span");
  name.textContent = label;
  row.append(name, control);
  return row;
}

function numberField(block, field) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "100";
  input.step = "1";
  input.value = String(block[field]);
  input.addEventListener("input", () => {
    const value = Number(input.value);
    if (!Number.isFinite(value)) return;
    block[field] = Math.min(100, Math.max(0, value));
    drawPanes();
  });
  return fieldRow(field, input);
}

function selectField(label, value, options, onPick) {
  const select = document.createElement("select");
  for (const [name, optionValue] of options) {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = name;
    select.append(option);
  }
  select.value = value;
  select.addEventListener("change", () => onPick(select.value));
  return fieldRow(label, select);
}

function textFields(block) {
  const box = document.createElement("div");

  const area = document.createElement("textarea");
  area.rows = 5;
  area.value = block.text;
  area.addEventListener("input", () => {
    block.text = area.value;
    drawPanes();
  });
  box.append(fieldRow("Text", area));

  box.append(selectField("Font", block.font || DEFAULT_FONT,
    FONTS.map((font) => [font, font]),
    (value) => { block.font = value; drawPanes(); }));

  box.append(selectField("Font size", block.fontSize || DEFAULT_FONT_SIZE,
    FONT_SIZES.map((size) => [size, size]),
    (value) => { block.fontSize = value; drawPanes(); }));

  box.append(selectField("Font colour", block.fontColor || DEFAULT_FONT_COLOR,
    FONT_COLORS,
    (value) => { block.fontColor = value; drawPanes(); }));

  return box;
}

function srcField(block) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = block.src;
  input.placeholder = "/scroll-poc/media/…";
  input.addEventListener("input", () => {
    block.src = input.value;
    drawPanes();
  });
  return fieldRow("Source", input);
}

// An event block has no copy of its own to edit: Show picks which posts,
// Limit how many, and the canvas label follows Show.
function eventFields(block) {
  const box = document.createElement("div");

  box.append(selectField("Show", block.show,
    [["Upcoming", "upcoming"], ["All", "all"]],
    (value) => { block.show = value; drawPanes(); }));

  const limit = document.createElement("input");
  limit.type = "number";
  limit.min = "1";
  limit.max = "20";
  limit.step = "1";
  limit.value = String(block.limit ?? "");
  limit.addEventListener("input", () => {
    const value = Number(limit.value);
    if (!Number.isFinite(value)) return;
    block.limit = Math.min(20, Math.max(1, value));
  });
  box.append(fieldRow("Limit", limit));

  return box;
}

function hrefField(block) {
  const input = document.createElement("input");
  input.type = "text";
  input.value = block.href || "";
  input.placeholder = "Optional: #id, /path, or an srinivasarka.org URL";
  input.addEventListener("input", () => {
    const value = input.value.trim();
    if (value === "") delete block.href;
    else block.href = value;
  });
  return fieldRow("href", input);
}

deleteButton.addEventListener("click", () => {
  const river = currentRiver();
  for (const key of ["top", "bottom"]) {
    const at = river[key].findIndex((block) => block.id === selectedId);
    if (at >= 0) {
      river[key].splice(at, 1);
      break;
    }
  }
  selectedId = null;
  drawPanes();
  drawFields();
});

// ---- Adding blocks ------------------------------------------------------

document.getElementById("add-text").addEventListener("click", () => addBlock("text"));
document.getElementById("add-image").addEventListener("click", () => addBlock("image"));
addMaskButton.addEventListener("click", () => addBlock("mask"));
document.getElementById("add-event").addEventListener("click", () => addBlock("event"));

function addBlock(type) {
  const river = currentRiver();
  const block = { id: freshId(river, type), type, x: 8, y: 8, w: 70, h: 16 };
  if (type === "text") block.text = "New text";
  if (type === "image" || type === "mask") {
    block.x = 25;
    block.y = 25;
    block.w = 50;
    block.h = 40;
  }
  if (type === "event") {
    block.y = 72;
    block.w = 84;
    block.h = 22;
    block.show = "upcoming";
    block.limit = 5;
  }
  if (type === "image") block.src = "/scroll-poc/media/trail.jpg";
  river[layer].push(block);
  selectedId = block.id;
  drawPanes();
  drawFields();
}

function freshId(river, type) {
  const taken = new Set([...river.top, ...river.bottom].map((block) => block.id));
  let n = 1;
  while (taken.has(`${type}-${n}`)) n += 1;
  return `${type}-${n}`;
}

// ---- Rivers, colour, tabs -----------------------------------------------

function buildRiverButtons() {
  for (const [id, name] of RIVER_NAMES) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.river = id;
    button.textContent = name;
    button.addEventListener("click", () => {
      riverId = id;
      selectedId = null;
      drawRiverButtons();
      drawPanes();
      drawFields();
      drawColourButtons();
    });
    riversNav.append(button);
  }
}

function drawRiverButtons() {
  for (const button of riversNav.children) {
    button.setAttribute("aria-pressed", button.dataset.river === riverId ? "true" : "false");
  }
}

document.getElementById("river-colour").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  currentRiver().color = button.dataset.color;
  drawPanes();
  drawColourButtons();
});

function drawColourButtons() {
  const color = currentRiver().color;
  for (const button of document.querySelectorAll("#river-colour button")) {
    button.setAttribute("aria-pressed", button.dataset.color === color ? "true" : "false");
  }
}

document.querySelector(".tabs").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  layer = button.dataset.layer;
  drawTabs();
});

function drawTabs() {
  for (const button of document.querySelectorAll(".tab")) {
    button.setAttribute("aria-pressed", button.dataset.layer === layer ? "true" : "false");
  }
  syncMaskButton();
  if (doc) drawPanes();
}

// The events board returns { upcoming, past }, each post
// { event_date, title, description }. show "upcoming" uses the first list.
// show "all" uses both, soonest date first. limit caps the count.
function postsForBlock(block) {
  if (!boardEvents) return [];
  const upcoming = Array.isArray(boardEvents.upcoming) ? boardEvents.upcoming : [];
  const past = Array.isArray(boardEvents.past) ? boardEvents.past : [];
  const posts = block.show === "all" ? upcoming.concat(past) : upcoming;
  const ordered = posts
    .filter((post) => post && typeof post.event_date === "string")
    .sort((a, b) => (a.event_date < b.event_date ? -1 : a.event_date > b.event_date ? 1 : 0));
  const limit = typeof block.limit === "number" ? block.limit : ordered.length;
  return ordered.slice(0, Math.max(0, limit));
}

function fillEventWindow(list, block) {
  list.replaceChildren();
  if (boardEvents === null) {
    const note = document.createElement("p");
    note.textContent = "Loading events…";
    list.append(note);
    return;
  }
  const posts = postsForBlock(block);
  if (posts.length === 0) {
    const note = document.createElement("p");
    note.textContent = "Nothing announced yet.";
    list.append(note);
    return;
  }
  for (const post of posts) {
    const item = document.createElement("p");
    const when = document.createElement("strong");
    when.textContent = post.event_date;
    item.append(when, document.createTextNode(` ${post.title || ""}`));
    list.append(item);
  }
}

async function loadBoardEvents() {
  try {
    const response = await fetch("/api/board-events");
    if (!response.ok) throw new Error(`Board list answered ${response.status}.`);
    boardEvents = await response.json();
  } catch (error) {
    console.warn("Events board unavailable.", error);
    boardEvents = { upcoming: [], past: [] };
  }
  if (doc) drawPanes();
}

function syncMaskButton() {
  addMaskButton.disabled = layer === "bottom";
  addMaskButton.title = layer === "bottom" ? "A mask on the still layer is invalid." : "";
}

// ---- Save, revert, history ----------------------------------------------

// GET /api/doc answers with the document itself; the writing routes wrap
// it as { body, saved_at }. Either shape is accepted, and only when it
// carries rivers.
function documentFrom(data) {
  if (data && Array.isArray(data.rivers)) return data;
  if (data && data.body && Array.isArray(data.body.rivers)) return data.body;
  return null;
}

function setStatus(text) {
  statusLine.textContent = text;
}

// A revert or restore hands back a whole document. The selection and the
// open river may name ids it does not carry, so both settle somewhere safe
// before the panes and fields are painted again.
function adoptDoc(next) {
  doc = next;
  selectedId = null;
  if (!currentRiver() && doc.rivers.length > 0) riverId = doc.rivers[0].id;
  drawRiverButtons();
  drawPanes();
  drawFields();
  drawColourButtons();
}

saveButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/doc", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    if (!response.ok) throw new Error(`PUT /api/doc answered ${response.status}.`);
    const saved = documentFrom(await response.json());
    if (saved !== null) doc = saved; // the stored copy becomes the only state
    setStatus("Saved.");
  } catch (error) {
    console.warn("Save failed.", error);
    setStatus("Save failed.");
  }
});

// Save is only the draft: the rivers page keeps whatever was published
// last. Publish snapshots the stored draft as the published document; it
// sends nothing, so on failure the page is exactly as it was.
publishButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/publish", { method: "POST" });
    if (!response.ok) throw new Error(`POST /api/publish answered ${response.status}.`);
    setStatus("Published.");
  } catch (error) {
    console.warn("Publish failed.", error);
    setStatus("Publish failed.");
  }
});

revertButton.addEventListener("click", async () => {
  try {
    const response = await fetch("/api/revert", { method: "POST" });
    if (response.status === 409) {
      setStatus("Nothing earlier to restore.");
      return;
    }
    if (!response.ok) throw new Error(`POST /api/revert answered ${response.status}.`);
    const previous = documentFrom(await response.json());
    if (previous === null) throw new Error("Revert returned no document.");
    adoptDoc(previous);
    setStatus("Reverted.");
  } catch (error) {
    console.warn("Revert failed.", error);
    setStatus("Revert failed.");
  }
});

historyButton.addEventListener("click", () => {
  if (!historyBox.hidden) {
    historyBox.hidden = true;
    return;
  }
  loadHistory();
});

async function loadHistory() {
  try {
    const response = await fetch("/api/history");
    if (!response.ok) throw new Error(`GET /api/history answered ${response.status}.`);
    drawHistory(await response.json());
  } catch (error) {
    console.warn("History failed.", error);
    setStatus("History failed.");
  }
}

function drawHistory(revisions) {
  historyBox.replaceChildren();
  if (revisions.length === 0) {
    const none = document.createElement("p");
    none.className = "hint";
    none.textContent = "No saved versions yet.";
    historyBox.append(none);
  }
  for (const revision of revisions) {
    const row = document.createElement("div");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = revision.savedAt;
    button.addEventListener("click", () => restoreAt(revision.savedAt));
    row.append(button);
    historyBox.append(row);
  }
  historyBox.hidden = false;
}

async function restoreAt(at) {
  try {
    const response = await fetch("/api/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ at }),
    });
    if (!response.ok) throw new Error(`POST /api/restore answered ${response.status}.`);
    const restored = documentFrom(await response.json());
    if (restored === null) throw new Error("Restore returned no document.");
    adoptDoc(restored);
    setStatus("Restored.");
  } catch (error) {
    console.warn("Restore failed.", error);
    setStatus("Restore failed.");
  }
}

// ---- Start --------------------------------------------------------------

function stopUnavailable() {
  document.body.classList.add("is-unavailable");
  document.body.replaceChildren();
  const note = document.createElement("p");
  note.className = "unavailable";
  note.textContent = "Document unavailable.";
  document.body.append(note);
}

async function start() {
  // The live document wins when the worker has one. A 404, an unreachable
  // worker, or a body without rivers falls through to the seed, and none
  // of that stops the page.
  let live = null;
  try {
    const response = await fetch("/api/doc");
    if (response.ok) live = documentFrom(await response.json());
  } catch (error) {
    console.warn("Live document unavailable.", error);
  }

  if (live !== null) {
    doc = live;
  } else {
    // The page loads ../doc.js as a module before this file; if the seed has
    // not appeared (the file missing, or nothing attached), try once more,
    // then stop on the words.
    if (typeof window.seedDoc !== "function") {
      try {
        await import("/present/doc.js");
      } catch (error) {
        console.warn("Presentation document unavailable.", error);
      }
    }
    if (typeof window.seedDoc !== "function") {
      stopUnavailable();
      return;
    }
    doc = structuredClone(window.seedDoc()); // the copy is the only state
    setStatus("Not saved yet.");
  }
  loadBoardEvents();
  buildRiverButtons();
  drawRiverButtons();
  drawTabs();
  drawPanes();
  drawFields();
  drawColourButtons();
}

start();
