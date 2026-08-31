#!/usr/bin/env node
// Builds src/data/ritual-schools.json ({school number: name}) from the ritual
// rip's own annotations — every `ritpow N # Name` line names its school.
//
//   node tools/extract-schools.mjs <rips-directory>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-schools.mjs <rips-directory>");
  process.exit(2);
}

const lines = fs
  .readFileSync(path.join(dir, "reference_ritual-data-v5_22_c5m.txt"), "utf8")
  .split(/\r?\n/);

const schools = {};
for (const line of lines) {
  const m = /^ritpow\s+(\d+)\s*#\s*(.+)/.exec(line.trim());
  if (m) schools[+m[1]] = m[2].trim();
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "ritual-schools.json"),
  JSON.stringify(schools, null, 1) + "\n",
);
console.log(`ritual schools: ${Object.keys(schools).length} named`);
