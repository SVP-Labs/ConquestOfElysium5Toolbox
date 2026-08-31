#!/usr/bin/env node
// Builds src/data/spells.json ({path number: [{name, level, weapon, dmg?,
// effect?, slowcast?}]}) and src/data/spell-paths.json ({path number: name})
// from the data source's spell extraction (Spell_Data_v5.33.txt).
//
// A dmg line with an annotation is an effect encoding, not a damage die
// ("dmg 512 # Strength +2.") — the annotation text is kept so the card can
// name the effect; a bare dmg is the damage die, however large (Finger of
// Death really is 1-999).
//
//   node tools/extract-spells.mjs <rips-dir>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-spells.mjs <rips-dir>");
  process.exit(2);
}

const text = fs.readFileSync(path.join(dir, "Spell_Data_v5.33.txt"), "utf8");

const spells = {};
const paths = {};
let effects = 0;

for (const block of text.split(/^(?=newspell\b)/m)) {
  const name = /^newspell\s+"([^"]+)"/.exec(block)?.[1];
  if (!name) continue;
  const p = /^path\s+(\d+)\s*#\s*([^.\r\n]+)\./m.exec(block);
  const level = /^level\s+(\d+)/m.exec(block);
  const weapon = /^weapon\s+.*#\s*nbr\s+(\d+)\./m.exec(block);
  const dmg = /^dmg\s+(\d+)[ \t]*(?:#[ \t]*([^\r\n]+?)\.?[ \t]*)?\r?$/m.exec(block);
  if (!p || !level || !weapon || !dmg) {
    console.error(`incomplete record for "${name}"`);
    process.exit(1);
  }
  paths[p[1]] = p[2].trim();
  const entry = { name, level: +level[1], weapon: +weapon[1] };
  if (dmg[2]) {
    entry.effect = dmg[2].trim();
    effects++;
  } else {
    entry.dmg = +dmg[1];
  }
  if (/^slowcast\b/m.test(block)) entry.slowcast = true;
  (spells[p[1]] ??= []).push(entry);
}

const out = (file, data) =>
  fs.writeFileSync(
    path.join(import.meta.dirname, "..", "src", "data", file),
    JSON.stringify(data, null, 1) + "\n",
  );
out("spells.json", spells);
out("spell-paths.json", paths);

const total = Object.values(spells).reduce((a, l) => a + l.length, 0);
console.log(
  `spells: ${total} across ${Object.keys(paths).length} paths; ${effects} effect spells, ${total - effects} with a damage die`,
);
