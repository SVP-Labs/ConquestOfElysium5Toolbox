# Conquest of Elysium 5 Toolbox

Browser tools for [Conquest of Elysium 5](https://www.illwinter.com/coe5/) modders.
Validate `.c5m` mod files and browse the complete command reference — no install,
and nothing is ever uploaded: every check runs in the browser tab.

Built on the [CoE5 mod validator](https://github.com/SvenPGH/ConquestOfElysium5ModValidator),
vendored here as the `modcheck/` git submodule. The site never forks the
validator's logic; client bundles get tiny `node:fs`/`node:path` shims
(`src/shims/`) so the validator's data loading works in the browser.

## Pages

- `/` — landing
- `/check` — paste or drop a `.c5m` file, get CLI-style diagnostics
- `/commands` — all 853 mod commands, fuzzy-searchable, filterable by section,
  base-game usage, manual coverage, and manual-vs-data disagreements
- `/commands/<name>` — one pre-rendered page per command: signature, arguments,
  manual page, attestation, and real usage examples from the base game data

See `DESIGN.md` for the full design brief and later phases.

## Development

```sh
git clone --recurse-submodules https://github.com/SvenPGH/ConquestOfElysium5Toolbox
npm ci
npm run dev
```

Requires Node 22. If you cloned without submodules: `git submodule update --init`.

### Regenerating command examples

`src/data/examples.json` holds short usage lines derived from the base-game data
rips. The rips themselves are not in this repository. To regenerate:

```sh
node tools/extract-examples.mjs /path/to/rips-directory
```

## Deployment (Coolify)

The repo ships a multi-stage `Dockerfile` (Node build → nginx serving `dist/`).

- Build pack: Dockerfile
- **Submodules must be enabled** in the Coolify app settings, or the build fails
  with "modcheck submodule is not checked out"
- Port: 80
- Domain: set in Coolify; the site uses only relative URLs

## License

MIT for the code in this repository. Command and name data under `modcheck/data/`
is derived from the CoE5 modding manual and community data extractions; see the
validator repository for details. Unaffiliated with Illwinter Game Design.
