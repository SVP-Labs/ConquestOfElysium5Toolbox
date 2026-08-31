#!/usr/bin/env node
// Builds src/data/rituals.json ({school: [{name, level, ap?, costs?}]}) from
// the rips. Ritual AP display follows the data source's annotation
// ("apcost 2 # Actual AP cost: 3." — shown AP is the value plus one).
// Spell paths come from the spell extraction (see extract-spells.mjs).
//
//   node tools/extract-rituals.mjs <rips-directory>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-rituals.mjs <rips-directory>");
  process.exit(2);
}
const read = (f) => fs.readFileSync(path.join(dir, f), "utf8").split(/\r?\n/);
const out = (f, data) =>
  fs.writeFileSync(path.join(import.meta.dirname, "..", "src", "data", f), JSON.stringify(data, null, 1) + "\n");

// Resource names for cost lines.
const vanilla = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "modcheck", "data", "vanilla.json")),
);

const rituals = {};
{
  let cur = null;
  const flush = () => {
    if (cur?.school !== undefined && cur.level !== undefined) {
      const entry = { name: cur.name, level: cur.level };
      if (cur.ap !== undefined) entry.ap = cur.ap + 1;
      if (cur.costs.length) entry.costs = cur.costs;
      (rituals[cur.school] ??= []).push(entry);
    }
    cur = null;
  };
  for (const line of read("Ritual_Data_v5.33.c5m")) {
    const t = line.trim();
    let m;
    if ((m = /^(?:newritual|selectritual)\s+"([^"]+)"/.exec(t))) {
      flush();
      cur = { name: m[1], costs: [] };
      continue;
    }
    if (!cur) continue;
    if ((m = /^ritpow\s+(\d+)/.exec(t))) cur.school = +m[1];
    else if ((m = /^level\s+(\d+)/.exec(t))) cur.level = +m[1];
    else if ((m = /^apcost\s+(\d+)/.exec(t))) cur.ap = +m[1];
    else if ((m = /^cost\s+(\d+)\s+(\d+)/.exec(t)))
      cur.costs.push([vanilla.resources[+m[1]] ?? `resource ${m[1]}`, +m[2]]);
  }
  flush();
  for (const list of Object.values(rituals)) list.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
}
out("rituals.json", rituals);

console.log(
  `rituals: ${Object.values(rituals).reduce((a, l) => a + l.length, 0)} across ${Object.keys(rituals).length} schools`,
);
