#!/usr/bin/env node
// Builds src/data/command-descriptions.json ({command: [{page, text}]}) —
// the modding manual's own description prose for each command, for the
// "What it does" section on the command pages.
//
// The column-splitting and signature-recognition approach mirrors the
// validator's tools/build-commands.mjs: the manual is a two-column PDF
// extraction, a run of three-plus spaces is the column gap, and a
// definition is a command name followed by nothing but argument tokens.
// Description lines are the prose segments sitting slightly deeper in the
// same column, until the next definition or heading takes the column back.
//
// Hand-written texts live in command-descriptions-overrides.json and win
// over this file — regeneration never touches them.
//
//   node tools/extract-descriptions.mjs <reference-dir>

import fs from "node:fs";
import path from "node:path";

const dir = process.argv[2];
if (!dir) {
  console.error("usage: extract-descriptions.mjs <reference-dir>");
  process.exit(2);
}

const manualLines = fs
  .readFileSync(path.join(dir, "reference_coe5-modding-manual-v5_36.txt"), "utf8")
  .split(/\r?\n/);

function segments(line) {
  const out = [];
  let col = 0;
  for (const part of line.split(/\s{3,}/)) {
    const start = line.indexOf(part, col);
    if (part.trim()) out.push({ text: part.trim(), col: start + (part.length - part.trimStart().length) });
    col = start + part.length;
  }
  return out;
}

const ARG = String.raw`(?:<[^>]*>|\[[^\]]*\]|"[^"]*"|“[^”]*”|\|)`;
const DEF = new RegExp(String.raw`^([+-]?[a-z][a-z0-9_]*)((?:\s+${ARG})*)$`);
const CONT = new RegExp(String.raw`^(?:${ARG}\s*)+$`);

// The index pages list every command but carry no prose.
const indexStart = manualLines.findIndex((l) => /addstring 33\s+ape 20/.test(l));
if (indexStart < 0) throw new Error("could not locate the alphabetical index");

const collected = new Map(); // command -> [{page, text}]
let page = 1;
// The manual's two columns run independently, and its command lists put a
// bare command name (a valid definition shape) in one column while a real
// definition with prose sits in the other — so each column band keeps its
// own collector. A collector belongs to whichever definitions sit within
// two characters of its column.
let opens = []; // [{name, page, col, lines: [], lastLine}]

const flushOne = (o) => {
  const text = o.lines.join(" ").replace(/\s+/g, " ").trim();
  if (text.length >= 20) {
    if (!collected.has(o.name)) collected.set(o.name, []);
    collected.get(o.name).push({ page: o.page, text });
  }
};
const flushAll = () => {
  for (const o of opens) flushOne(o);
  opens = [];
};

for (let i = 0; i < indexStart; i++) {
  const line = manualLines[i];
  if (line.includes("\f")) {
    page++;
    flushAll(); // descriptions crossing a page/column break are cut, not merged wrongly
  }
  for (const s of segments(line)) {
    const d = DEF.exec(s.text);
    if (d) {
      // A definition takes over the collector of its own column band.
      const at = opens.findIndex((o) => Math.abs(s.col - o.col) <= 2);
      if (at >= 0) {
        flushOne(opens[at]);
        opens.splice(at, 1);
      }
      opens.push({ name: d[1], page, col: s.col, lines: [], lastLine: i });
      continue;
    }
    // Prose attaches to the collector it sits slightly deeper than.
    const owner = opens.find((o) => s.col - o.col >= 1 && s.col - o.col <= 8);
    if (owner) {
      // Wrapped signature tail, handled by the signature parser — skip it.
      if (i - owner.lastLine <= 1 && s.col - owner.col <= 2 && CONT.test(s.text)) continue;
      if (i - owner.lastLine <= 3) {
        owner.lines.push(s.text);
        owner.lastLine = i;
        continue;
      }
    }
    // A segment landing on a collector's own column start takes that
    // column back (heading, table row, next list). Segments in the other
    // column are none of its business.
    opens = opens.filter((o) => {
      if (s.col >= o.col - 2 && s.col <= o.col) {
        flushOne(o);
        return false;
      }
      return true;
    });
  }
}
flushAll();

const out = {};
for (const [name, texts] of [...collected].sort(([a], [b]) => a.localeCompare(b))) {
  const seen = new Set();
  out[name] = texts.filter((t) => !seen.has(t.text) && seen.add(t.text));
}

fs.writeFileSync(
  path.join(import.meta.dirname, "..", "src", "data", "command-descriptions.json"),
  JSON.stringify(out, null, 1) + "\n",
);
const total = Object.keys(out).length;
const paras = Object.values(out).reduce((a, l) => a + l.length, 0);
console.log(`descriptions: ${total} commands, ${paras} paragraphs`);
