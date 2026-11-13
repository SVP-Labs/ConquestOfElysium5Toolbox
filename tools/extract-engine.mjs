#!/usr/bin/env node
// Builds src/data/engine-stacking.json: for each ability command, whether the
// game adds up the values items give (sum) or keeps only the highest
// (highest), as read from the CoE5 game binary. Input is the clean side of the
// reverse-engineering workspace (findings/<version>/interactions.json: facts in
// our own words, no game code). Where the parser accepts each command, its
// bounds and verified quirks come from the validator's data/engine.json.
//
//   node tools/extract-engine.mjs <coe5re>/findings/5.42

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: node tools/extract-engine.mjs <coe5re findings/<version> dir>");
  process.exit(1);
}

const interactions = JSON.parse(fs.readFileSync(path.join(dir, "interactions.json"), "utf8"));
const out = {};
for (const [name, entry] of Object.entries(interactions).sort(([a], [b]) => a.localeCompare(b))) {
  if (entry.item_stacking) out[name] = entry.item_stacking;
}
const target = path.join(import.meta.dirname, "..", "src", "data", "engine-stacking.json");
fs.writeFileSync(target, JSON.stringify(out, null, 1) + "\n");
console.log(`engine-stacking.json: ${Object.keys(out).length} commands`);
