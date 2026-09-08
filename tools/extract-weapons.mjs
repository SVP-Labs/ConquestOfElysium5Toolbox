#!/usr/bin/env node
// Builds src/data/weapons.json from the weapon-data rip: per-weapon display
// stats (dmg, init, range, damage type) keyed by case-folded name. The first
// weapon of a name wins, matching how the engine resolves a bare name.
//
//   node tools/extract-weapons.mjs <rips-directory>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-weapons.mjs <rips-directory>");
  process.exit(2);
}

const lines = fs
  .readFileSync(path.join(dir, "Weapon_Data_v5.33.c5m"), "utf8")
  .split(/\r?\n/);

const byName = {};
const byIndex = {};
let cur = null;
let count = 0;

for (const line of lines) {
  const nw = /^(?:newweapon|selectweapon)\s+"([^"]+)"\s*#\s*(\d+)/.exec(line);
  if (nw) {
    count++;
    const key = nw[1].trim().toLowerCase();
    cur = { name: nw[1] };
    byIndex[+nw[2]] = cur;
    if (!byName[key]) byName[key] = cur;
    continue;
  }
  if (!cur) continue;
  const kv = /^(dmg|init|range|aoe)\s+(-?\d+)/.exec(line.trim());
  if (kv) cur[kv[1]] = +kv[2];
  const dt = /^dmgtype\s+\d+\s*#\s*([A-Za-z ]+?)\./.exec(line.trim());
  if (dt) cur.type = dt[1].trim();
  if (/^an(\s|$)/.test(line.trim())) cur.an = true;
  // Targeting flags feed the spell-tag cross references and the Special
  // column of the combat spells table.
  const flag = /^(affectundead|affecthuman|affectanimal|affectmale|affectfemale|undead|undkill|holykill|stonekill|wallkill|tree|soft|mundane|drown|reanimate|ghoulify)(\s|#|$)/.exec(line.trim());
  if (flag) (cur.flags ??= []).push(flag[1]);
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "weapons.json"),
  JSON.stringify(byName, null, 1) + "\n",
);
fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "weapons-index.json"),
  JSON.stringify(byIndex, null, 1) + "\n",
);
console.log(`weapons: ${count} records, ${Object.keys(byName).length} unique names, ${Object.keys(byIndex).length} by index`);
