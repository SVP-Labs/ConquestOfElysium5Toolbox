#!/usr/bin/env node
// E2E check of the /play unit card against real base-game monsters: builds
// each character's playground source from the rips, renders it through the
// live preview (npx astro preview must be running on :4321), and verifies
// stats, weapon rows, damage display strings, flags and resistance badges.
//
//   node tools/test-characters.mjs <rips-dir> "Spearman" "Troll King" ...
import fs from "node:fs";
import { chromium } from "playwright-core";

const R = process.argv[2] ?? "./reference/reference";
const weaponsByName = JSON.parse(fs.readFileSync(new URL("../src/data/weapons.json", import.meta.url)));

// weapon index -> name
const idx2name = {};
for (const line of fs.readFileSync(`${R}/reference_weapon-data-v5_22_c5m.txt`, "utf8").split(/\r?\n/)) {
  const m = /^(?:newweapon|selectweapon)\s+"([^"]+)"\s*#\s*(\d+)/.exec(line);
  if (m) idx2name[+m[2]] = m[1];
}

const WEAPON_CMDS = new Set(["meleeweapon","meleeweaponspec","meleeweaponbonus","meleeweapon50s",
  "rangedweapon","rangedweapon50","rangedweapon50s","rangedweapon25","rangedweaponbonus",
  "siegeweapon","assassinweapon","prebatweapon"]);
const STATS = ["hp","str","mr","mor","armor","rank"];

function parseMonster(name) {
  const lines = fs.readFileSync(`${R}/reference_monster-data-v5_22_c5m.txt`, "utf8").split(/\r?\n/);
  const start = lines.findIndex((l) => new RegExp(`^newmonster\\s+"${name}"`).test(l));
  if (start < 0) return null;
  const rec = { name, stats: {}, weapons: [], flags: [], res: [] };
  for (let i = start + 1; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^(?:newmonster|selectmonster)/.test(t)) break;
    let m;
    if ((m = /^(\w+)\s+(-?\d+)\s*#/.exec(t)) && STATS.includes(m[1])) rec.stats[m[1]] = +m[2];
    else if ((m = /^(\w+)\s+(-?\d+)\s+(\d+)\s*#/.exec(t)) && WEAPON_CMDS.has(m[1]))
      rec.weapons.push({ cmd: m[1], dmg: +m[2], wname: idx2name[+m[3]] });
    else if ((m = /^(\w+res)\s+(-?\d+)\s*#/.exec(t))) rec.res.push({ cmd: m[1], v: +m[2] });
    else if ((m = /^(\w+)\s{2,}#/.exec(t))) rec.flags.push(m[1]);
  }
  return rec;
}

function toSource(rec) {
  const out = [`newmonster "${rec.name}"`];
  for (const s of STATS) if (rec.stats[s] !== undefined) out.push(`${s} ${rec.stats[s]}`);
  for (const w of rec.weapons) if (w.wname) out.push(`${w.cmd} ${w.dmg} "${w.wname}"`);
  for (const f of rec.flags) out.push(f);
  for (const r of rec.res) out.push(`${r.cmd} ${r.v}`);
  return out.join("\n");
}

function expectedDamage(w) {
  const rec = weaponsByName[w.wname.toLowerCase()];
  if (!rec) return null;
  const wep = rec.dmg ?? 0;
  return wep > 0 ? (w.dmg > 0 ? `1-${wep} (+${w.dmg})` : `1-${wep}`) : `1-${w.dmg}`;
}

const NAMES = process.argv.slice(3);
const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
const page = await browser.newPage();
await page.goto("http://localhost:4321/play");
await page.waitForTimeout(400);

let fails = 0;
for (const name of NAMES) {
  const rec = parseMonster(name);
  if (!rec) { console.log(`SKIP ${name}: not found`); continue; }
  await page.locator("#source").fill(toSource(rec));
  await page.waitForTimeout(350);
  const card = await page.locator("#unit-card").innerText();
  const rows = await page.locator("#unit-card table tbody tr").allInnerTexts();
  const problems = [];
  if (!card.includes(rec.name)) problems.push("name missing");
  for (const [k, label] of [["hp","Hit Points"],["str","Strength"],["mr","Magic Resistance"],["armor","Armor"]]) {
    if (rec.stats[k] !== undefined && !new RegExp(`${label}\\s+${rec.stats[k]}\\b`).test(card.replace(/\n/g," ")))
      problems.push(`${label} != ${rec.stats[k]}`);
  }
  const resolvable = rec.weapons.filter((w) => w.wname);
  if (rows.length !== resolvable.length) problems.push(`weapon rows ${rows.length} != ${resolvable.length}`);
  for (const w of resolvable) {
    const exp = expectedDamage(w);
    if (exp && !rows.some((r) => r.includes(exp))) problems.push(`missing damage "${exp}" for ${w.wname}`);
  }
  for (const r of rec.res) {
    const el = r.cmd.slice(0,-3); const label = el[0].toUpperCase()+el.slice(1);
    const exp = r.v >= 100 ? `${label} immunity` : r.v > 0 ? `${label} Resistance ${r.v}` : `${label} Vulnerability ${-r.v}`;
    if (!card.includes(exp)) problems.push(`missing resistance "${exp}"`);
  }
  const known = rec.flags.filter((f) => card.includes(f));
  console.log(`${problems.length ? "FAIL" : "PASS"}  ${name}  (${resolvable.length} weapons, ${known.length}/${rec.flags.length} flags shown, ${rec.res.length} res)`);
  for (const pr of problems) { console.log("   ", pr); fails++; }
}
await browser.close();
process.exit(fails ? 1 : 0);
