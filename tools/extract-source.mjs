#!/usr/bin/env node
// Builds src/data/source-{kind}.json ({index: {name, block}}) — the full
// mod-format definition of every base-game record, for the /source pages.
//
// Only the command lines enter the output. The data source's `#` annotations
// are stripped: they are the extractor's own commentary, not game data, and
// the permission on record covers the record definitions themselves. String
// arguments keep their content; literal newlines inside them (the extraction
// expanded the game's `^` paragraph marks) are folded back to `^`, so every
// block is valid mod syntax that can be pasted straight into a mod file.
//
//   node tools/extract-source.mjs <rips-dir>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-source.mjs <rips-dir>");
  process.exit(2);
}

const vanilla = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "modcheck", "data", "vanilla.json"), "utf8"),
);

// start: opens a numbered block (counter from `base`, or the explicit number
// for terrains). stop: other sections of the file that must not leak into an
// open block. patch: name-addressed additions appended to the record they
// select (the ritual file patches a few descrs via selectritual).
const KINDS = {
  monsters: { file: "Monster_Data_v5.33.c5m", start: /^newmonster "/, base: 0 },
  weapons: { file: "Weapon_Data_v5.33.c5m", start: /^newweapon "/, base: 0 },
  items: { file: "Magic_Item_Data_v5.33.c5m", start: /^newitem "/, base: 0 },
  rituals: {
    file: "Ritual_Data_v5.33.c5m",
    start: /^newritual "/,
    base: 1,
    stop: /^(?:newrit|newspell[123]|newlocplanes)\b/,
    patch: /^selectritual "/,
  },
  terrains: { file: "Terrain_Data_v5.33.c5m", start: /^selectterr (-?\d+)/, explicit: true },
  classes: { file: "Class_Data_v5.33.c5m", start: /^newclass\b/, base: 1 },
};

// One pass over a whole file, tracking quote state across lines: outside
// quotes a `#` discards the rest of the physical line; inside quotes a
// newline becomes `^`.
function stripComments(raw) {
  let cleaned = "";
  let inQuote = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (ch === '"') {
      inQuote = !inQuote;
      cleaned += ch;
    } else if (inQuote) {
      if (ch === "\n") cleaned += "^";
      else if (ch !== "\r") cleaned += ch;
    } else if (ch === "#") {
      while (i < raw.length && raw[i + 1] !== "\n") i++;
    } else if (ch !== "\r") {
      cleaned += ch;
    }
  }
  return cleaned;
}

// Collapse the rip's column padding: runs of spaces outside quotes become a
// single space. Strings hold no newlines any more, so this is per line.
function tidy(line) {
  let out = "";
  let quoted = false;
  for (const ch of line) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && (ch === " " || ch === "\t")) {
      if (out !== "" && !out.endsWith(" ")) out += " ";
    } else {
      out += ch;
    }
  }
  return out.trimEnd();
}

const firstString = (line) => /"([^"]*)"/.exec(line)?.[1];

for (const [kind, cfg] of Object.entries(KINDS)) {
  const lines = stripComments(fs.readFileSync(path.join(dir, cfg.file), "utf8")).split("\n");
  const records = {};
  const patches = [];
  let idx = null;
  let counter = (cfg.base ?? 0) - 1;
  let inPatch = false;

  for (const rawLine of lines) {
    const line = tidy(rawLine);
    if (!line) continue;
    const startMatch = cfg.start.exec(line);
    if (startMatch) {
      inPatch = false;
      idx = cfg.explicit ? Number(startMatch[1]) : ++counter;
      records[idx] = { name: firstString(line) ?? vanilla[kind]?.[idx] ?? `${kind} ${idx}`, block: line };
      continue;
    }
    if (cfg.patch?.test(line)) {
      inPatch = true;
      idx = null;
      patches.push({ name: firstString(line), block: line });
      continue;
    }
    if (cfg.stop?.test(line)) {
      inPatch = false;
      idx = null;
      continue;
    }
    if (inPatch) patches.at(-1).block += "\n" + line;
    else if (idx !== null) records[idx].block += "\n" + line;
  }

  // Classes and terrains name themselves inside the block.
  for (const [n, rec] of Object.entries(records)) {
    const inner = /^(?:name|setclassname) "([^"]*)"/m.exec(rec.block)?.[1];
    if (!firstString(rec.block.split("\n")[0]) && inner) rec.name = inner;
  }

  // A patch appends to the first record carrying the selected name — the
  // same way the engine resolves an unqualified name reference. Some target
  // class-special rituals outside the numbered table (El's Seals and the
  // like); those have no page to attach to.
  let skippedPatches = 0;
  for (const p of patches) {
    const hit = Object.values(records).find((r) => r.name === p.name);
    if (hit) hit.block += "\n\n" + p.block;
    else skippedPatches++;
  }

  // Sanity: numbering and names must agree with the validator's own tables.
  const table = vanilla[kind];
  const total = Object.keys(records).length;
  if (total !== Object.keys(table).length) {
    console.error(`${kind}: ${total} blocks vs ${Object.keys(table).length} in vanilla.json`);
    process.exit(1);
  }
  for (const n of Object.keys(records)) {
    if (records[n].name !== table[n]) {
      console.error(`${kind}: index drift at ${n}: "${records[n].name}" vs "${table[n]}"`);
      process.exit(1);
    }
  }

  fs.writeFileSync(
    path.join(import.meta.dirname, "..", "src", "data", `source-${kind}.json`),
    JSON.stringify(records, null, 1) + "\n",
  );
  console.log(
    `${kind}: ${total} blocks` +
      (patches.length
        ? ` (+${patches.length - skippedPatches} patches folded in, ${skippedPatches} target unnumbered rituals)`
        : ""),
  );
}
