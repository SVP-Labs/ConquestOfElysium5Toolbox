#!/usr/bin/env node
// Builds src/data/source-monsters.json ({index: {name, block}}) — the full
// mod-format definition of every base-game monster, for the /source pages.
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

const raw = fs.readFileSync(path.join(dir, "Monster_Data_v5.33.c5m"), "utf8");

// One pass over the whole file, tracking quote state across lines: outside
// quotes a `#` discards the rest of the physical line; inside quotes a
// newline becomes `^`.
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

// Collapse the rip's column padding: runs of spaces outside quotes become a
// single space. Strings hold no newlines any more, so this is per line.
const tidy = (line) => {
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
};

const monsters = {};
let idx = -1;
for (const rawLine of cleaned.split("\n")) {
  const line = tidy(rawLine);
  if (!line) continue;
  if (line.startsWith("newmonster ")) {
    idx++;
    const name = /^newmonster "([^"]*)"/.exec(line)?.[1] ?? `monster ${idx}`;
    monsters[idx] = { name, block: line };
    continue;
  }
  if (idx >= 0) monsters[idx].block += "\n" + line;
}

// Sanity: the numbering must agree with the validator's own name table.
const vanilla = JSON.parse(
  fs.readFileSync(path.join(import.meta.dirname, "..", "modcheck", "data", "vanilla.json"), "utf8"),
);
const total = Object.keys(monsters).length;
if (total !== Object.keys(vanilla.monsters).length) {
  console.error(`count mismatch: ${total} blocks vs ${Object.keys(vanilla.monsters).length} in vanilla.json`);
  process.exit(1);
}
for (const n of [0, 935, total - 1]) {
  if (monsters[n].name !== vanilla.monsters[n]) {
    console.error(`index drift at ${n}: "${monsters[n].name}" vs "${vanilla.monsters[n]}"`);
    process.exit(1);
  }
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "source-monsters.json"),
  JSON.stringify(monsters, null, 1) + "\n",
);
console.log(`source blocks: ${total} monsters, indices 0-${total - 1}`);
