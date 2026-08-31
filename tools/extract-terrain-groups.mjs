#!/usr/bin/env node
// Builds src/data/terrain-groups.json ({negative number: description}) from
// the modding manual's "Negative terrain numbers" table (page 25). These are
// the standard terrain groups a negative terrain argument refers to; the
// numbers -1000 to -1199 are reserved for mod-defined groups and are not
// listed here.
//
//   node tools/extract-terrain-groups.mjs <reference-dir>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-terrain-groups.mjs <reference-dir>");
  process.exit(2);
}

const lines = fs
  .readFileSync(path.join(dir, "reference_coe5-modding-manual-v5_36.txt"), "utf8")
  .split(/\r?\n/);

const start = lines.findIndex((l) => l.trim() === "Negative terrain numbers");
if (start < 0) {
  console.error("table heading not found");
  process.exit(1);
}

// The manual is a two-column PDF extraction: each line may carry a fragment
// of the terrain-group table in either column, three-plus spaces apart. The
// right column of the heading's page starts above the heading line, so the
// window reaches back as well as forward.
const groups = {};
for (const line of lines.slice(Math.max(0, start - 40), start + 150)) {
  for (const segment of line.split(/\s{3,}/)) {
    const m = /^-(\d+) = (.+?)\s*$/.exec(segment.trim());
    if (m) groups[-m[1]] = m[2];
  }
}

// The table must be contiguous from -1 down; a gap means the parse broke.
const numbers = Object.keys(groups).map(Number).sort((a, b) => b - a);
numbers.forEach((n, i) => {
  if (n !== -(i + 1)) {
    console.error(`gap in table: expected ${-(i + 1)}, got ${n}`);
    process.exit(1);
  }
});

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "terrain-groups.json"),
  JSON.stringify(groups, null, 1) + "\n",
);
console.log(`terrain groups: ${numbers.length} (${numbers[0]} to ${numbers.at(-1)})`);
