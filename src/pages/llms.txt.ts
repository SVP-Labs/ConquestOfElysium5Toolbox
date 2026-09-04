// /llms.txt — the llmstxt.org convention: a curated markdown map of the site
// for LLMs and AI crawlers. Generated at build time so the counts always
// match the data the pages themselves render.
import data from "../../modcheck/data/vanilla.json";
import commandTable from "../../modcheck/data/commands.json";
import schools from "../data/ritual-schools.json";
import terrainGroups from "../data/terrain-groups.json";

const SITE = "https://toolbox.svp.gl";
const commands = Object.keys(commandTable.commands).length;

const body = `# Conquest of Elysium 5 Toolbox

> Free browser tools for Conquest of Elysium 5 modders: a mod-file validator,
> a searchable reference of all ${commands} mod commands with real base-game
> usage examples, and ID tables for every monster, weapon, item, ritual,
> terrain, class and resource number the base game defines. Everything runs
> client-side in the browser — nothing is uploaded. A community project,
> unaffiliated with Illwinter Game Design.

The mod format is line-based: one command per line, string arguments in double
quotes, \`#\` starts a comment. Data tables reflect ${commandTable.meta.rips};
command signatures come from the ${commandTable.meta.manual}, widened by real
base-game usage where they disagree. All pages are pre-rendered static HTML.

## Tools

- [Validator](${SITE}/check): paste or drop a .c5m mod file and get CLI-style
  diagnostics (errors, warnings, hints) entirely in the browser.
- [Command reference](${SITE}/commands): all ${commands} commands,
  fuzzy-searchable, filterable by section, attestation and documentation
  status. Each command has its own page at /commands/{name} with signature,
  argument types, valid sections, manual page number and real usage examples.

## Data tables

- [ID tables overview](${SITE}/data): every numeric ID the base game defines,
  with the name each number refers to.
- [Monsters](${SITE}/data/monsters): ${Object.keys(data.monsters).length} units and commanders.
- [Weapons](${SITE}/data/weapons): ${Object.keys(data.weapons).length} weapon records.
- [Items](${SITE}/data/items): ${Object.keys(data.items).length} magic items.
- [Rituals](${SITE}/data/rituals): ${Object.keys(data.rituals).length} rituals.
- [Ritual schools](${SITE}/data/schools): the ${Object.keys(schools).length} pow numbers.
- [Terrains](${SITE}/data/terrains): ${Object.keys(data.terrains).length} terrain numbers.
- [Terrain groups](${SITE}/data/terrain-groups): the ${Object.keys(terrainGroups).length} negative terrain
  numbers (-1 to -${Object.keys(terrainGroups).length}); mods define their own in -1000 to -1199.
- [Classes](${SITE}/data/classes): the ${Object.keys(data.classes).length} playable classes.
- [Resources](${SITE}/data/resources): ${data.resources.length} resource numbers.

## Legal

- [Impressum](${SITE}/impressum)
- [Privacy](${SITE}/privacy): no accounts, no analytics, no uploads — checks
  run locally in the visitor's browser. Server access logs only ever contain
  anonymized (shortened) IP addresses; rotated log files are deleted after
  14 days at the latest.
`;

export function GET() {
  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
