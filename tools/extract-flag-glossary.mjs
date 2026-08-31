#!/usr/bin/env node
// Builds src/data/monster-flags.json: one-line explanations for bare monster
// flags, read from the monster rip's own annotations. Scoped to the monster
// file on purpose — the same flag can mean something else in other sections.
//
//   node tools/extract-flag-glossary.mjs <rips-directory>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-flag-glossary.mjs <rips-directory>");
  process.exit(2);
}

const lines = fs
  .readFileSync(path.join(dir, "reference_monster-data-v5_22_c5m.txt"), "utf8")
  .split(/\r?\n/);

const glossary = {};
for (const line of lines) {
  const m = /^(\w+)\s{2,}#\s(.+)/.exec(line.trim());
  if (m && !glossary[m[1]]) glossary[m[1]] = m[2].trim();
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "monster-flags.json"),
  JSON.stringify(glossary, null, 1) + "\n",
);
console.log(`monster flag glossary: ${Object.keys(glossary).length} entries`);
