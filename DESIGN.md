# Conquest of Elysium 5 Toolbox — design brief

Agreed design for the modding site, distilled from the concept document and the
design interview of 2026-08-28. This is the contract for the Phase 1 build;
anything not listed under Phase 1 is explicitly deferred.

## Identity

- **Name:** Conquest of Elysium 5 Toolbox (full name in header and title tags,
  e.g. "Conquest of Elysium 5 Toolbox — addunitrec").
- **Domain:** a subdomain of the owner's domain, along the lines of
  `toolbox-conquest.svp.gl` (final name set at Coolify config time; the site
  uses relative URLs and a single config constant for canonical URLs, so the
  choice is not baked in).
- **This repo** holds the site. The validator lives in
  [SvenPGH/ConquestOfElysium5ModValidator](https://github.com/SvenPGH/ConquestOfElysium5ModValidator)
  and is consumed here as a **git submodule** pinned to a commit. The site
  never forks the validator's logic.

## Stack and deployment

- **Astro, static output.** All 853 `/commands/:name` pages plus the list and
  landing pages are pre-rendered HTML — people find the site by Googling
  command names, so the pages must be indexable. Interactive parts (`/check`,
  filters, search) are vanilla-ESM islands; no UI framework.
- **Build and hosting:** Coolify on the owner's VPS (Docker-based, auto-deploy
  on git push). The repo ships a Dockerfile: Node build stage (installs,
  builds the Astro site) → static file-server stage. Coolify must be set to
  check out submodules.
- **No backend, ever.** No accounts, database, analytics, or ads. Every check
  runs in the browser tab; the site states this in plain words next to the
  input ("nothing is uploaded").
- **No offline support.** The concept's service-worker idea is dropped, not
  deferred — decided unnecessary.
- **Theming/accessibility:** dark theme by default; diagnostics never rely on
  colour alone (the severity word stays visible). `/commands` pages must be
  readable on a phone; `/check` may be desktop-first.

## Validator changes required

The validator's linting core is already browser-clean; two modules are not:

- `src/catalog.js` loads `commands.json` / `vanilla.json` via `node:fs`.
  **Phase 1 requires a minimal patch** (a PR to the validator repo) so the
  data loads in a way bundlers and browsers understand — static JSON imports
  or an injected-data entry point. Nothing else changes.
- `src/project.js` (`lintMod`) reads directories from disk. **Not needed in
  Phase 1** (no folder drop); when folder-drop ships later, `lintMod` gets a
  pure core over a `{filename: content}` map with a thin Node `fs` wrapper.

## Phase 1 — scope of the first build

Routes:

| route | what it is |
|---|---|
| `/` | Thin landing: short pitch, feature cards linking to `/check` and `/commands`, the privacy line. |
| `/check` | Barest-MVP validator: paste box + single-file drop for a `.c5m`, results rendered CLI-style (source line, underlined span, message, hint), severity filter. |
| `/commands` | All 853 commands; client-side fuzzy search (reusing the validator's `suggest.js` capped-Levenshtein); all four filters: **section**, **attested vs never-used** (314 commands have zero base-game uses — the site's unique offering), **undocumented in manual** (3 commands), **manual-vs-data disagreement** (from `notes`). |
| `/commands/:name` | One pre-rendered page per command: signature with named arguments, argument types/ranges, valid sections, manual page number, attestation count, disagreement note, **real usage examples extracted from the game rips**, and related commands (derived: shared section + shared name stem — `commands.json` has no such field). No Try-it button until `/play` exists. |

Explicitly **not** in Phase 1: `/play`, `/data`, `/source`, all `/tools/*`
pages, `/known`, folder drop, editable results, permalinks, CLI-copy/rule
dismiss, service worker.

### Precondition: the rips

Command-page examples require the game-data rips (and modding manual), which
are not in any repo. The owner **uploads them into the Claude session when the
build starts**; the build derives per-command example lines from them at build
time. Only the derived examples data enters this public repo — the rips
themselves are never committed here or to the validator repo, both being
public. **The Phase 1 build waits for this upload.**

## Licensing position

**PERMISSION GRANTED (2026-08-29).** Johan (Illwinter) replied to the owner's
permission mail: "I don't mind any of those things" — covering (1) the
per-command example lines and name/index tables already shown, (2) a future
`/source` view reproducing full record definitions from the game data, and
(3) showing unit sprites as thumbnails. The email is archived by the owner
and serves as the license record. Colonel Dracula's answer (for the
extraction itself) is still outstanding.

Bonus from the same reply: of the 3 undocumented commands the site surfaced,
`siegeable` is NOT a real CoE5 command (a mixup in the extraction — the real
command for that effect is `walls`); the other two are correct and Johan is
adding them to the manual. The `siegeable` fix belongs in the validator
repo's data (`commands.json` is generated), not in this repo.

## Later phases (agreed dispositions, not scoped)

- **Phase 2:** `/play` (context-pane playground over `lintSource`, live
  validation, autocomplete on command and entity names, signature strip,
  explain panel) and `/data` (ID browser over `vanilla.json`). Try-it buttons
  appear on command pages when `/play` ships. `/data` shipped once Illwinter's
  permission arrived (built in `a16811c`, briefly held, restored in the
  reapply commit).

  **Agreed additions to `/play` (2026-08-31):**
  - **Unit-card preview**: typing a `newmonster` block renders a live
    game-style unit panel, modelled on the in-game unit tab (reference: the
    War Elephant screenshot) — two-column stat grid (HP, Strength, Morale,
    XP | MR, Armor, Rank, Kills), ability/item icon strip, weapons table
    (Weapon / Init / Range / Damage / Special), flavor description below,
    sprite top-right. Tier 1 shows only what the block states (names
    resolved via `vanilla.json`); tier 2 resolves `copystats`/`copyspr`
    via a `stats.json` built from the rips (permission granted — the same
    pipeline unlocks `/source`); engine defaults are never guessed — a
    stat not written shows as "not set" until verified via `/known`.
  - **Sprite thumbnails** in `/data` and the preview: permission granted;
    blocked only on an asset handoff (sprite dump mapped to indices — the
    text rips contain no images). Lazy-loaded per row once provided.
- **Phase 3:** `/tools/sprite`, `/tools/package`, `/tools/format`,
  `/tools/scaffold`. Folder-drop on `/check` (needs the `lintMod` browser
  core) fits here.
- **Phase 4:** `/known` (markdown-in-repo verified-mechanics registry, seeded
  from the 314 never-used commands) and `/tools/collisions`. Ask the Steam
  modding community whether `/known` is wanted before building it.
- **`/source`:** SHIPPED for monsters (2026-09-05) — 1,851 pages at
  /source/monsters/{n}, generated by tools/extract-source.mjs from the
  v5.33 monster rip into source-monsters.json. Only the command lines are
  published: the extractor's own `#` annotations are stripped (they are the
  extractor author's commentary, his answer to the outreach is still
  outstanding, and some are known to be wrong — e.g. the siegeable
  description). Literal newlines the extraction introduced inside descr
  strings are folded back to the game's `^` marks, so every block is valid,
  lintable, paste-ready mod syntax (verified: linting all 1,851 blocks
  yields only known base-game quirks). Command names link to
  /commands/:name; /data/monsters rows link to their source pages. The
  other record types (weapons, items, rituals, …) follow after review.
- **VS Code extension:** separate future project wrapping the same validator;
  the site links to it and its hover cards link back to `/commands/:name`.
  Not part of any site phase.

## Process

The Phase 1 build happens **after the owner reviews this brief** and provides
the rips. Development on branch `claude/coe5-tools-static-site-or6dfo`.

## Verified engine rules (pending /known)

Collected evidence for unit-card derivations; each rule ships only with its
source attached (see the rules table in play.astro).

- **mor 99 = Mindless** — modding manual, `mor` entry. Implemented.
- **Displayed weapon damage = 1d(monster weapon-line dmg + weapon record
  dmg)** — verified against all 2,421 annotated weapon lines in the monster
  rip (12 weapon command families, zero mismatches) plus the in-game unit
  tab (Bow 0+3 → "1–3", Gore 7+0 → "1–7") and the Troll King cross-check
  (str 10, line 25 + Great Club 7 → d32 — proving strength is NOT part of
  the die; the str-added hypothesis fits 0 of 2,421 lines). Corroborated by
  the gameplay.tips guide ("displayed as 1dX(+Y), in actual fact 1d(X+Y)");
  rolls are open-ended: a max result adds another die at −1. Display format
  (owner's in-game observation, 2026-08-31): the range shown is the WEAPON's
  own die with the monster's weapon-line dmg as a (+N) suffix — "1-4 (+5)" —
  collapsing to a plain "1-N" when the weapon die is 0 (all damage from the
  monster, e.g. Gore); the effective roll is always 1d(sum). Implemented:
  weapons.json (tools/extract-weapons.mjs) carries per-weapon dmg/init/
  range/type, and the card computes the die for base-game weapons and for
  weapons the source itself defines.
- **Init and Range come from the weapon record** (Bow init 2 / range 5
  match the in-game tab). Needs stats.json.
- **Weapon-record `aoe` encodings** — decoded by matching each value against
  the community wiki's "Area of Effect" wording (CC BY-SA) for the spells
  that carry it: negative N = "N strikes" (Ice Shards −3, Iron Darts −7,
  Poison Bolts −3, Lashes of Fire −3, Tendrils of Death −7 all match);
  1–100 = "burst N" (Falling Fires burst 25 also confirmed in-game);
  997 = circle (Ring of Flames, Aura of Unlife); 998 = all friends (Army of
  Gold, Legion of Ice/Stone, Strange Dimensions); 999 = all enemies (Arcane
  Tempest, Iron Storm, Mass Command); 9996/9998/9999 = entire battlefield
  (Animate Forest/Swamp, Slumbering Army, Hellfire/Blizzard/Gale/Solar
  Brilliance); 9997 = 15% of battlefield (Meteor Showers); 92NN = NN bounces
  (Chain Lightning 9208, Lightning Storm 9212); 70NN = crack NN (Maws of the
  Earth 7005, Chasm 7015); 50NN = line NN (Lightning Bolt 5005). Unmapped
  values (breath/gaze families 1002–4025) display "special area". The wiki
  lists Combustion as "burst 4" against the record's aoe −4 — treated as a
  wiki slip, since five other negative-aoe spells confirm "strikes".
- **Spell data comes from the game data itself (v5.33)** — the
  Spell_Data_v5.33 extraction carries every combat spell's path, level,
  weapon record and dmg as first-party data (1,029 spells, 68 paths),
  replacing the earlier wiki join. An annotated dmg
  ("dmg 512 # Strength +2.") is an effect encoding, not a die — the card
  shows "special" with the effect named on hover; a bare dmg is the die,
  however large (Finger of Death really is 1-999 — the wiki shows the
  same). Cross-check: the wiki join matched the extraction's per-path
  spell counts exactly except the Destruction school, which the wiki
  lacks. The wiki (CC BY-SA) remains the source only for the aoe-encoding
  wording above.
- **Standard terrain groups (-1 to -115)** — the manual's "Negative terrain
  numbers" table (page 25), extracted by tools/extract-terrain-groups.mjs
  into terrain-groups.json and shown at /data/terrain-groups. Corroborated:
  59 of the 60 negative terrain numbers the v5.33 dumps use carry
  annotations agreeing with the manual. The 60th, `terr -120` on the
  Animate Tools ritual, is in neither the manual nor the extraction's own
  notes ("Required terrain: ???") — an open question. Groups -1000 to
  -1199 are mod-defined (`selectterrgroup`), so they have no fixed names.
- **Strength's combat role (owner's play knowledge, 2026-09-03):** str
  mainly determines how fast a unit recovers from stuns and similar
  states — it is NOT part of the damage die, matching the earlier
  data-side proof (str-in-die fits 0 of the annotated weapon lines).
  Damage stays: weapon record = the default die, the monster's own dmg =
  the (+value).
- **Unverified:** the `*(+1)` suffix on displayed range (lob/elevation?);
  the negated event conditions
  (`-turnnbr`, `-player`, …) and gate/wall terrain commands that appear
  only in the community Notepad++ syntax file — in neither the v5.36
  manual nor any data extraction, so not yet in the validator's catalog.

**Data source version:** Colonel Dracula's v5.33 extraction
(2026-08-31 upload), which added the Spell and Nametype files and the
Guildmasters class. The damage-die formula above was verified against the
v5.22 monster rip's 2,421 annotated weapon lines; v5.33 is the same
author and format. The rips live only in the session scratchpad and the
validator's untracked reference dir — never in either repo.
- **Sprite mapping is free:** the monster rip carries `# sprite number NNNN`
  per monster — the extraction only needs images named by those numbers.
