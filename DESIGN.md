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
- **`/source`:** permission granted (see Licensing position); no longer
  blocked. Needs the rips as a build input when it gets scoped and built.
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
  dmg)** — extraction annotations ("Base damage (added to dmg value where
  this weapon is used)"; per-line comments like "Gore: d7 Slash damage"),
  confirmed against the in-game unit tab (Bow 0+3 → "1–3", Gore 7+0 →
  "1–7"), corroborated by the gameplay.tips CoE5 guide ("displayed as
  1dX(+Y), in actual fact 1d(X+Y)"). Rolls are open-ended: a max result
  adds another die at −1 (same guide). Needs stats.json to implement.
- **Init and Range come from the weapon record** (Bow init 2 / range 5
  match the in-game tab). Needs stats.json.
- **Unverified:** the `*(+1)` suffix on displayed range (lob/elevation?),
  strength's role in combat resolution.
- **Sprite mapping is free:** the monster rip carries `# sprite number NNNN`
  per monster — the extraction only needs images named by those numbers.
