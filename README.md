# Terra Invicta Engine Charts

GitHub Pages builder and static dashboard for Terra Invicta engine comparison charts.

The generated Pages site lives in `docs/index.html`. The page includes a language selector for Korean and English instead of generating one chart per language.

The normal local build is a checked-in-data/UI-only build: it rebuilds the dashboard shell and copied browser modules from source files while using the checked-in generated catalogs under `data/generated/`. Rebuilding research, ship, and drive data from a local Terra Invicta installation is supported, but it is an explicit workflow because it depends on machine-local Steam paths and game data.

## Current dashboard features

* Compare Terra Invicta drives by research cost, total mass, propellant mass, acceleration (TWR), thrust, efficiency, and power requirements.
* Adjust simulation assumptions such as dry mass, target dV, radiator type, engine count, minimum acceleration, and module effects.
* Use the Dry Mass Calculator and built-in ship design presets to compare practical ship configurations.
* Inspect compatible power-plant steps, generated drive progression links, Pareto-dominated candidates, and impractical low-TWR or extreme-mass candidates.
* Save and load chart and dry-mass presets in browser local storage.
* Switch the interface between English and Korean from the dashboard itself.

## Basic setup

Install Node dependencies:

```powershell
npm ci
```

Install Python development tools when you want to run the full verification
suite, including SPDX/REUSE license checks:

```powershell
python -m pip install -r requirements-dev.txt
```

Playwright's Chromium browser is only required when you run browser verification
through `npm run verify`, `npm run verify:browser`, or `./scripts/build-wsl.sh --verify`:

```powershell
npm run playwright:install
```

On WSL/Linux, the WSL build helper can create a repo-local Python virtualenv and run `npm ci` for you:

```bash
./scripts/build-wsl.sh --help
```

Enable GitHub Pages for the repository and publish the generated `docs/` directory from `main`, using either the repository Pages settings or the deployment workflow configured for this repository.

## Default checked-in/UI-only build

Use this for normal UI, CSS, JavaScript client, template, preset-library, and documentation work. It does not read the local Terra Invicta installation and does not regenerate the checked-in drive, research, or ship catalogs.

```powershell
npm run build
```

Run verification separately when you need it. Full verification includes the
SPDX/REUSE license check:

```powershell
npm run verify
```

The default build runs:

```powershell
python scripts/rebuild_pages.py --ui-only --no-commit --no-push --skip-verify
```

`--ui-only` uses the checked-in repo-local catalogs instead of reading a local Terra Invicta install. Pass `--input-html-data <path>` directly to `scripts/rebuild_pages.py` only for explicit legacy or debug rebuilds that need to reuse embedded data from an existing generated HTML file.

`npm run build:fast` is kept as a compatibility alias for the same no-verification build path.

## Windows workflow

Recommended default Windows build workflow:

```powershell
npm ci
npm run build
```

For full validation, install Playwright's browser once and run verification separately:

```powershell
npm run playwright:install
npm run verify
```

Local Terra Invicta data rebuilds are explicit. Use them only when you intentionally want to refresh checked-in generated data from your local game install:

```powershell
npm run build:from-game -- --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates"
```

Then run verification separately if needed:

```powershell
npm run verify
```

You may also pass a version override when auto-detection is not enough:

```powershell
python .\scripts\rebuild_pages.py --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates" --game-version 1.0.32 --no-commit --no-push
```

`npm run deploy` preserves the existing publishing workflow: it rebuilds from local game data, stages only the generated output paths listed below, commits, and pushes. Do not use it for ordinary local UI-only validation.

## WSL workflow

Use the WSL helper from inside WSL, not from PowerShell or Git Bash:

```bash
./scripts/build-wsl.sh
```

The helper:

* creates or reuses `.venv-wsl/`;
* installs Python requirements if a requirements file is present;
* installs Node dependencies with `npm ci` when `package-lock.json` exists;
* verifies that `python`, `node`, `npm`, and `npx` resolve to Linux/WSL tools rather than Windows `.exe` or `.cmd` tools under `/mnt/c`;
* runs the default checked-in/UI-only build without committing, pushing, or running browser verification.

Run verification separately when needed:

```bash
npm run verify
```

If you specifically want the build script to run its Playwright browser verification step, pass `--verify`:

```bash
./scripts/build-wsl.sh --verify
```

`--skip-verify` is still accepted for compatibility, but verification is skipped by default.

Run an explicit local-game-data rebuild from WSL:

```bash
./scripts/build-wsl.sh --from-game
```

With an explicit Templates path:

```bash
./scripts/build-wsl.sh --from-game \
  --templates-dir "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"
```

You can also set `TI_TEMPLATES_DIR` or `VENV_DIR`:

```bash
TI_TEMPLATES_DIR="/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates" ./scripts/build-wsl.sh --from-game
VENV_DIR="$PWD/.venv-wsl" ./scripts/build-wsl.sh
```

## Local Terra Invicta data rebuild

This repository has one local-game-data rebuild path. It reads the local Terra Invicta `Templates` directory and regenerates checked-in catalog/site output without running verification by default:

* `data/generated/research_catalog.json`
* `docs/research_catalog.md`
* `data/generated/ship_catalog.json`
* `docs/ship_catalog.md`
* `docs/index.html`
* `docs/assets/js/**`

Windows:

```powershell
npm run build:from-game -- --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates"
```

WSL:

```bash
./scripts/build-wsl.sh --from-game \
  --templates-dir "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"
```

The builder embeds template source names and the detected game version at the bottom of the page. Version detection uses `AIDump.txt` when available, falls back to the Steam appmanifest build id, and can be overridden with `--game-version`. Run `npm run verify` separately after a local-game-data rebuild when you want full validation.

There is currently no separate full refresh or deep extraction mode in this repository. `--from-game` is the explicit full catalog rebuild. If a future workflow needs a more expensive extraction step, keep it behind a separately named option or script rather than adding it to the default build.

## Built-in presets

Built-in chart and dry-mass preset entries can be added to `data/preset_library.json`. The builder embeds `chartPresets` and `dryMassPresets` from that file into `docs/index.html`; use `--preset-library path\to\file.json` to build from a different preset library. Entries use the same shape as exported named presets: chart presets carry a `settings` object, and dry-mass design presets carry a `dryMassDesign` object plus optional `simulationDefaults`.

To convert a normal exported chart preset JSON into safe built-in entries, run:

```powershell
python tools/add_builtin_preset.py path\to\exported_preset.json
```

By default, the helper adds one built-in chart preset and extracts any
`designPresetLibrary` or `dryMassPresetLibrary` entries into top-level
`dryMassPresets`. The generated chart preset settings do not keep those embedded
library snapshots, and `selectedDesignPresetId` is rewritten to the built-in
design preset ID when the selected design can be matched.

Useful options:

```powershell
python tools/add_builtin_preset.py path\to\exported_preset.json --name "Missile Battleship - Advanced Defense"
python tools/add_builtin_preset.py path\to\exported_preset.json --chart
python tools/add_builtin_preset.py path\to\exported_preset.json --dry-mass-library
python tools/add_builtin_preset.py path\to\exported_preset.json --preset-library path\to\preset_library.json
python tools/add_builtin_preset.py path\to\exported_preset.json --on-conflict skip
```

If neither `--chart` nor `--dry-mass-library` is passed, both are enabled.
Duplicate source IDs are handled with stable numeric suffixes by default; use
`--on-conflict skip` to reuse existing entries or `--on-conflict replace` to
overwrite entries with matching IDs.

## Generated output and deployment scope

The deploy script only stages these generated files:

* `data/generated/research_catalog.json`
* `docs/research_catalog.md`
* `data/generated/ship_catalog.json`
* `docs/ship_catalog.md`
* `docs/index.html`
* `docs/assets/js`

Other local changes are left untouched.

## Documentation and planning notes

The repository uses `docs/` as a pure generated Pages/output root. This includes the generated dashboard, published client modules, and generated catalog Markdown files. Do not use `docs/` for durable documentation or planning notes, and do not hand-edit generated `docs/**` artifacts as source.

Durable project guidance lives in:

- `README.md` for setup, build, deploy, dashboard scope, and generated-output policy;
- `AGENTS.md` for contributor and agent workflow rules;
- `.github/**` for issue, PR, review, and automation guidance;
- `dev-docs/architecture.md` for the working client architecture map.

Temporary implementation plans and profiling notes live in `dev-docs/plan/**`. Those folders may be deleted after the related PR is merged, closed, or abandoned. Before deleting a plan folder, promote only still-useful decisions or validated findings into durable documentation or the relevant GitHub issue.

## License

Project-owned source code, build/test tooling, and documentation are licensed
under the MIT License. See `LICENSE` and the SPDX metadata in `REUSE.toml`.

Generated catalogs, generated catalog documentation, and generated page bundles
that contain Terra Invicta-derived identifiers or data are not covered by MIT.
They are marked with `LicenseRef-Terra-Invicta-Data` in `REUSE.toml` and remain
subject to the terms and ownership applicable to Terra Invicta and its
rightsholders.

## Troubleshooting Windows tools leaking into WSL PATH

If `./scripts/build-wsl.sh` fails with a message that `python`, `node`, `npm`, or `npx` resolves to a Windows tool, check what WSL is actually running:

```bash
command -v python python3 node npm npx
printf '%s\n' "$PATH" | tr ':' '\n'
```

Problem signs include paths like:

* `/mnt/c/Program Files/nodejs/npm.cmd`
* `/mnt/c/Users/<you>/AppData/Local/Microsoft/WindowsApps/python.exe`
* any `.exe`, `.cmd`, or `.bat` result for required build tools

Install the Linux versions inside WSL and make sure WSL paths come first. For example, use your distro package manager or `nvm` for Node, install Python inside WSL, then clear the shell command cache:

```bash
hash -r
command -v python3 node npm npx
```

Run the build helper again after the commands resolve to Linux paths.
