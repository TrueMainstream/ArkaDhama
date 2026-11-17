// The presentation document for the three-river scroll.
//
// Plain functions over plain data: no DOM, no fetch, no rendering. Whatever
// draws the rivers later reads this shape; this module only describes it.

const SITE_ORIGIN = "https://www.srinivasarka.org/";

const RIVERS = [
  { id: "events", label: "Events & News", theme: "body", color: "#6e4b32" },
  { id: "about", label: "About", theme: "spirit", color: "#6d2430" },
  { id: "training", label: "Methods & Training", theme: "mind", color: "#3d4c68" },
  { id: "communities", label: "Communities", theme: "spirit", color: "#6d2430" },
  { id: "dhama", label: "Arka Dhama", theme: "spirit", color: "#6d2430" },
  { id: "videos", label: "Videos", theme: "spirit", color: "#6d2430" },
  { id: "books", label: "Books", theme: "spirit", color: "#6d2430" },
  { id: "articles", label: "Articles", theme: "spirit", color: "#6d2430" },
  { id: "contact", label: "Contact", theme: "spirit", color: "#6d2430" },
];

const BLOCK_TYPES = ["text", "image", "mask"];

export function emptyDoc() {
  return {
    rivers: RIVERS.map((river) => ({
      id: river.id,
      label: river.label,
      theme: river.theme,
      color: river.color,
      top: [],
      bottom: [],
    })),
  };
}

export function validateDoc(doc) {
  const errors = [];

  if (!isObject(doc)) {
    return { ok: false, errors: ["doc must be an object: { rivers: River[] }."] };
  }
  if (!Array.isArray(doc.rivers)) {
    return { ok: false, errors: ["doc.rivers must be an array of nine rivers."] };
  }
  if (doc.rivers.length !== RIVERS.length) {
    errors.push(
      `doc.rivers must hold exactly ${RIVERS.length} rivers, found ${doc.rivers.length}.`
    );
  }

  const count = Math.min(doc.rivers.length, RIVERS.length);
  for (let i = 0; i < count; i += 1) {
    validateRiver(doc.rivers[i], RIVERS[i], i, errors);
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

function validateRiver(river, expected, index, errors) {
  const where = `rivers[${index}] (${expected.id})`;
  if (!isObject(river)) {
    errors.push(`${where} must be an object.`);
    return;
  }
  if (river.id !== expected.id) {
    errors.push(
      `${where} must have id ${show(expected.id)} in this position, found ${show(river.id)}.`
    );
  }
  for (const field of ["label", "theme", "color"]) {
    if (typeof river[field] !== "string") {
      errors.push(`${where}.${field} must be a string.`);
    }
  }
  const seen = new Set();
  for (const layer of ["top", "bottom"]) {
    const blocks = river[layer];
    if (!Array.isArray(blocks)) {
      errors.push(`${where}.${layer} must be an array.`);
      continue;
    }
    blocks.forEach((block, j) => {
      validateBlock(block, `${where}.${layer}[${j}]`, layer, seen, errors);
    });
  }
}

function validateBlock(block, where, layer, seen, errors) {
  if (!isObject(block)) {
    errors.push(`${where} must be an object.`);
    return;
  }
  if (typeof block.id !== "string" || block.id.length === 0) {
    errors.push(`${where}: id must be a non-empty string.`);
  } else if (seen.has(block.id)) {
    errors.push(`${where}: id "${block.id}" is already used in this river.`);
  } else {
    seen.add(block.id);
  }
  if (!BLOCK_TYPES.includes(block.type)) {
    errors.push(`${where}: type must be text, image, or mask.`);
  }
  for (const field of ["x", "y", "w", "h"]) {
    const value = block[field];
    if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
      errors.push(`${where}: ${field} must be a number from 0 to 100.`);
    }
  }
  if (block.type === "mask" && layer === "bottom") {
    errors.push(`${where}: mask is only allowed on the top layer.`);
  }
  if (block.shape !== undefined && block.shape !== "rect") {
    errors.push(`${where}: shape must be rect.`);
  }
  if (block.type === "text" && typeof block.text !== "string") {
    errors.push(`${where}: text blocks need a string text.`);
  }
  if (block.type === "image" && (typeof block.src !== "string" || !isSitePath(block.src))) {
    errors.push(`${where}: image blocks need a string src that is a site path.`);
  }
  if (block.href !== undefined && !isAllowedHref(block.href)) {
    errors.push(
      `${where}: href must be an anchor (#id), a same-site path (/...), or a ${SITE_ORIGIN}... path.`
    );
  }
}

function isSitePath(src) {
  // Rooted and not protocol-relative, which also rules out data: and
  // external URLs.
  return src.startsWith("/") && !src.startsWith("//");
}

function isAllowedHref(href) {
  if (typeof href !== "string") {
    return false;
  }
  if (href.startsWith("#")) {
    return href.length > 1; // an anchor needs its id
  }
  if (isSitePath(href)) {
    return true;
  }
  return href.startsWith(SITE_ORIGIN) && href.length > SITE_ORIGIN.length;
}

// Seed copy lifted verbatim from scroll-poc/index.html at bc52249. Each scene
// keeps its eyebrow, headline, and body, joined into one text block; nothing
// new is written here. Portraits and masks are later rounds, so every seeded
// block is text on the top layer and every bottom layer stays empty.
//
// Geometry, in percentages of the river's lane: stacked blocks sit at
// y 8, 28, 48, 68, 88 — an even gap of 20 between slot tops — with x 8,
// w 84, h 16. A river carrying a single block centres it at y 42 instead,
// same width and height.
const SEED_COPY = {
  events: [
    ["events-header", "", "Events", "Talks, retreats, and gatherings with Srinivas Arka."],
    [
      "india",
      "Now",
      "Srinivas Arka is in India.",
      "Welcome to Yogi Srinivas Arka at Arka Dhama, Mysuru. From here the journey continues to New Zealand, Australia, and Fiji.",
    ],
    [
      "canada",
      "Canada",
      "CCA Canada, sixteen years.",
      "The Centre for Conscious Awareness in Canada marked its sixteenth anniversary in Vaughan on 9 August 2026.",
    ],
    [
      "communities",
      "Communities",
      "Seven countries, one practice.",
      "Centres for Conscious Awareness in the United Kingdom, United States, Canada, New Zealand, Australia, Spain, and India.",
    ],
    [
      "dhama",
      "Arka Dhama",
      "Ten acres outside Mysuru.",
      "A sanctuary kept for more than forty years. Meditation at sunrise, organic farming, Ayurveda, and the Shree Arka Mahaganapathy Spiritual Centre.",
    ],
  ],
  training: [
    [
      "training-header",
      "",
      "Training",
      "Arka Dhyana, the Intuitive Intelligence Programme, and the Arka School of Yoga.",
    ],
    [
      "dhyana",
      "Arka Dhyana",
      "Breath, sound, and touch.",
      "Intuition awakens when intelligence is exhausted. The method lets the heart supersede the mind.",
    ],
    [
      "petals",
      "Five petals",
      "Health, wealth, communication, love, self-awareness.",
      "The Intuitive Intelligence Programme treats spiritual development and ordinary life as one practice.",
    ],
    [
      "yoga",
      "Arka School of Yoga",
      "The body keeps the balance.",
      "Traditional Yoga training alongside the meditation, so the practice has somewhere to live.",
    ],
    [
      "training-dhama",
      "Arka Dhama",
      "Where the method is kept.",
      "Daily practice, study, and the land itself are part of the training.",
    ],
  ],
  books: [
    // The Products header, relabelled with the Books label.
    ["books-header", "", "Books", "Books and talks. Coppersun Books has carried the writing since 2003."],
    [
      "books",
      "Books",
      "Arka Dhyana Intuitive Meditation.",
      "The method, developed over twenty-five years. Becoming Inspired, Petals of the Heart, and Bright Moon sit beside it.",
    ],
    [
      "reach",
      "The work",
      "Wisdom has to be reachable.",
      "Books in several languages, audio, and the talks, so the teaching is not limited to the room it was given in.",
    ],
  ],
  videos: [
    [
      "videos",
      "Videos",
      "A retreat in England.",
      "The 2025 Arka Dhyana retreat, and a ninety-day journey through the United Kingdom, Canada, Mexico, Spain, and Scotland.",
    ],
  ],
  about: [
    [
      "about",
      "About",
      "Third generation of a family of yogis.",
      "Born in India, a master's in English literature, seven languages, and more than thirty years of teaching on four continents.",
    ],
  ],
  contact: [
    // The Events footer sentence.
    [
      "contact-footer",
      "",
      "",
      "Write about a gathering, or join the list for what comes next.",
    ],
  ],
  communities: [["communities-header", "", "Communities", ""]],
  dhama: [["dhama-header", "", "Arka Dhama", ""]],
  articles: [["articles-header", "", "Articles", ""]],
};

function seedBlock([id, eyebrow, headline, body], slot, single) {
  return {
    id,
    type: "text",
    x: 8,
    y: single ? 42 : 8 + slot * 20,
    w: 84,
    h: 16,
    text: [eyebrow, headline, body].filter((part) => part !== "").join("\n\n"),
  };
}

export function seedDoc() {
  const doc = emptyDoc();
  for (const river of doc.rivers) {
    const scenes = SEED_COPY[river.id];
    if (!scenes) {
      continue;
    }
    const single = scenes.length === 1;
    river.top = scenes.map((scene, slot) => seedBlock(scene, slot, single));
  }
  return doc;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function show(value) {
  return typeof value === "string" ? `"${value}"` : String(value);
}
