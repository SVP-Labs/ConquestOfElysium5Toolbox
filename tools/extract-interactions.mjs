#!/usr/bin/env node
// Builds src/data/command-interactions.json — cross-references between
// commands, mined from the "What it does" description texts: when one
// command's description names another command, both pages get an
// "Interacts with" entry carrying the sentence that connects them.
//
// Curated interaction groups (hand-written notes for mechanics that span
// several commands, e.g. banishment) live in interaction-groups.json and
// are rendered by the page directly — this extractor only handles the
// mechanical name-mention edges.
//
//   node tools/extract-interactions.mjs

import fs from "node:fs";
import path from "node:path";

const dataDir = path.join(import.meta.dirname, "..", "src", "data");
const read = (f) => JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8"));

const manual = read("command-descriptions.json");
const authored = read("command-descriptions-overrides.json");
const catalog = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "modcheck", "data", "commands.json"), "utf8"),
).commands;

// Command names that are ordinary English words: a match in prose almost
// never refers to the command, so they never become mention edges. Kept
// short and auditable; genuinely interacting families these words belong
// to are covered by the curated groups instead.
const STOP = new Set([
  "name", "next", "type", "level", "start", "cost", "range", "free",
  "gold", "iron", "trade", "hands", "dead", "description", "sound", "look",
  "large", "huge", "tiny", "fast", "slow", "power", "protection", "armor",
  "human", "animal", "female", "holy", "poison", "shield", "morale",
  "forest", "desert", "swamp", "mountain", "snow", "water", "temple",
  "citadel", "mine", "port", "town1", "town2", "wall", "wander", "drain",
  "split", "ship", "reform", "spread", "smoke", "cave", "rank", "unique",
  "rare", "invert", "summoning", "promotion", "insanity", "statue", "troll",
]);

// Per-command description paragraphs with their source labels.
const texts = {};
for (const [n, list] of Object.entries(manual)) {
  texts[n] = list.map((p) => ({ text: p.text, source: `manual, page ${p.page}` }));
}
for (const [n, t] of Object.entries(authored)) {
  texts[n] = [{ text: t, source: "toolbox note" }];
}

const names = Object.keys(catalog).filter((n) => n.length >= 4 && !STOP.has(n));

const sentenceWith = (text, name) => {
  const re = new RegExp(`\\b${name.replace(/[+]/g, "\\+")}\\b`);
  if (!re.test(text)) return null;
  for (const s of text.split(/(?<=\.)\s+/)) {
    // Abbreviations like "e.g." split mid-sentence; a fragment that short
    // is worse than the whole paragraph.
    if (re.test(s)) return s.trim().length >= 30 ? s.trim() : text.slice(0, 220).trim();
  }
  return null;
};

const edges = {}; // command -> [{with, sentence, source}]
const add = (from, to, sentence, source) => {
  (edges[from] ??= []);
  if (!edges[from].some((e) => e.with === to)) edges[from].push({ with: to, sentence, source });
};

for (const [n, paras] of Object.entries(texts)) {
  for (const m of names) {
    if (m === n) continue;
    for (const p of paras) {
      const sentence = sentenceWith(p.text, m);
      if (sentence) {
        // Both pages get the edge, carrying the sentence and whose
        // description it came from.
        add(n, m, sentence, `${n}'s description (${p.source})`);
        add(m, n, sentence, `${n}'s description (${p.source})`);
        break;
      }
    }
  }
}

for (const list of Object.values(edges)) list.sort((a, b) => a.with.localeCompare(b.with));

fs.writeFileSync(
  path.join(dataDir, "command-interactions.json"),
  JSON.stringify(Object.fromEntries(Object.entries(edges).sort(([a], [b]) => a.localeCompare(b))), null, 1) + "\n",
);
const total = Object.values(edges).reduce((a, l) => a + l.length, 0);
console.log(`interactions: ${Object.keys(edges).length} commands, ${total} directed edges`);
