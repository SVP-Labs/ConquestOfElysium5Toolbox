// Derives per-command usage examples from CoE5 game-data rip files.
//
// Usage: node tools/extract-examples.mjs <rips-dir>
//
// The rip files are Illwinter's content and must never land in the repo;
// only the derived example lines are written to src/data/examples.json.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { readStatements } from "../modcheck/src/statements.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, "..");

const KINDS = [
  ["monster-data", "monster"],
  ["weapon-data", "weapon"],
  ["ritual-data", "ritual"],
  ["terrain-data", "terrain"],
  ["magic-item-data", "item"],
  ["recruitment-data", "recruitment"],
  ["class-data", "class"],
];

function kindFor(filename) {
  for (const [needle, kind] of KINDS) {
    if (filename.includes(needle)) return kind;
  }
  return null;
}

const MAX_LEN = 100;

function clip(text) {
  return text.length > MAX_LEN ? text.slice(0, 97) + "…" : text;
}

async function main() {
  const ripsDir = process.argv[2];
  if (!ripsDir) {
    console.error("usage: node tools/extract-examples.mjs <rips-dir>");
    process.exit(1);
  }

  const table = JSON.parse(
    await readFile(path.join(repoRoot, "modcheck", "data", "commands.json"), "utf8"),
  );
  const known = new Set(Object.keys(table.commands));

  // command -> Map(lowercased text -> {text, kind})
  const candidates = new Map();

  let filesParsed = 0;
  let statementsSeen = 0;

  const entries = (await readdir(ripsDir)).sort();
  for (const entry of entries) {
    const kind = kindFor(entry);
    if (!kind) continue;

    const source = await readFile(path.join(ripsDir, entry), "utf8");
    const rawLines = source.split(/\r?\n/);
    const { statements } = readStatements(source);
    filesParsed += 1;
    statementsSeen += statements.length;

    for (const statement of statements) {
      if (!known.has(statement.name)) continue;
      const text = clip(rawLines[statement.line - 1].trim());
      let pool = candidates.get(statement.name);
      if (!pool) candidates.set(statement.name, (pool = new Map()));
      const key = text.toLowerCase();
      if (!pool.has(key)) pool.set(key, { text, kind });
    }
  }

  // Selection: sort unique candidates by length ascending, pick shortest,
  // middle, longest (deduping indexes when fewer than 3 uniques exist).
  const output = {};
  let totalExamples = 0;
  for (const command of [...candidates.keys()].sort()) {
    const unique = [...candidates.get(command).values()].sort(
      (a, b) => a.text.length - b.text.length,
    );
    const last = unique.length - 1;
    const picks = [...new Set([0, Math.floor(last / 2), last])];
    output[command] = picks.map((i) => unique[i]);
    totalExamples += picks.length;
  }

  const outPath = path.join(repoRoot, "src", "data", "examples.json");
  await writeFile(outPath, JSON.stringify(output, null, 2) + "\n");

  console.log(`files parsed:      ${filesParsed}`);
  console.log(`statements seen:   ${statementsSeen}`);
  console.log(`commands covered:  ${Object.keys(output).length} of ${known.size}`);
  console.log(`examples emitted:  ${totalExamples}`);
  console.log(`wrote ${path.relative(repoRoot, outPath)}`);
}

await main();
