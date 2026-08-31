#!/usr/bin/env node
// Builds src/data/spells.json ({folded school name: [{name, level, weapon}]})
// from cached CoE5 community-wiki wikitext (CC BY-SA — credit the wiki
// wherever these lists render). School pages list their spells per level via
// {{#lsth: Level N Spells|Section}} transclusions whose section refs
// disambiguate same-name variants; the level pages' hidden comments carry the
// weapon index each spell maps to in the game data.
//
//   node tools/extract-spells.mjs <dir with *.wikitext files>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-spells.mjs <wikitext-dir>");
  process.exit(2);
}

// Section ref -> weapon index, per level page.
const weaponBySection = {};
for (const level of [1, 2, 3]) {
  const text = fs.readFileSync(path.join(dir, `Level_${level}_Spells.wikitext`), "utf8");
  const sections = text.split(/^=== (.+?) ===$/m);
  for (let i = 1; i < sections.length; i += 2) {
    const ref = sections[i].trim();
    const m = /<!--\s*weapon:\s*(\d+)(?:,\s*dmg:\s*(\d+))?/.exec(sections[i + 1]);
    // The dmg in the comment is only a damage die when the visible entry has
    // a "Damage" line — buff/utility spells reuse the field for effect
    // strength (e.g. Fire Ward's dmg 4 is the resistance amount).
    const dealsDamage = /^\s*\*+\s*Damage\b/m.test(sections[i + 1]);
    if (m)
      weaponBySection[`Level ${level} Spells|${ref}`] = {
        weapon: +m[1],
        dmg: dealsDamage && m[2] !== undefined ? +m[2] : undefined,
      };
  }
}

const spells = {};
let missing = 0;
for (const file of fs.readdirSync(dir)) {
  if (!file.endsWith(".wikitext") || /^Level_\d_Spells/.test(file)) continue;
  const school = file.replace(/\.wikitext$/, "").replaceAll("_", " ");
  const text = fs.readFileSync(path.join(dir, file), "utf8");
  const list = [];
  let level = null;
  for (const line of text.split(/\r?\n/)) {
    let m;
    if ((m = /^==\s*Level (\d) Spells\s*==/.exec(line))) { level = +m[1]; continue; }
    if (/^==[^=]/.test(line)) { level = null; continue; }
    if (level && (m = /^===\s*(.+?)\s*===/.exec(line))) { list.push({ name: m[1], level }); continue; }
    if (level && list.length && (m = /\{\{#lsth:\s*(Level \d Spells)\s*\|\s*(.+?)\s*\}\}/.exec(line))) {
      const w = weaponBySection[`${m[1]}|${m[2]}`];
      if (w !== undefined) Object.assign(list.at(-1), w);
      else missing++;
    }
  }
  if (list.length) spells[school.toLowerCase()] = list;
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "spells.json"),
  JSON.stringify(spells, null, 1) + "\n",
);
const total = Object.values(spells).reduce((a, l) => a + l.length, 0);
const linked = Object.values(spells).flat().filter((s) => s.weapon !== undefined).length;
console.log(`spells: ${total} across ${Object.keys(spells).length} schools; ${linked} linked to weapon records, ${missing} unresolved refs`);
