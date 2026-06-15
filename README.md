# Terra Invicta Engine Charts

GitHub Pages builder and static dashboard for Terra Invicta engine comparison charts.

The generated Pages site lives in `docs/index.html`. The page includes a language selector for Korean and English instead of generating one chart per language.

The normal local build is a checked-in-data/UI-only build: it rebuilds the dashboard shell and copied browser modules from source files while reusing the already checked-in catalog data embedded in `docs/index.html`. Rebuilding research, ship, and drive data from a local Terra Invicta installation is supported, but it is an explicit workflow because it depends on machine-local Steam paths and game data.

## Current dashboard features

* Compare Terra Invicta drives by research cost, total mass, propellant mass, acceleration (TWR), thrust, efficiency, and power requirements.
* Adjust simulation assumptions such as dry mass, target dV, radiator type, engine count, minimum acceleration, and module effects.
* Use the Dry Mass Calculator and built-in ship design presets to compare practical ship configurations.
* Inspect compatible power-plant steps, generated drive progression links, Pareto-dominated candidates, and impractical low-TWR or extreme-mass candidates.
* Save and load chart and dry-mass presets in browser local storage.
* Switch the interface between English and Korean from the dashboard itself.

## Basic setup

Install Node dependencies and Playwright's Chromium browser:

```powershell
npm ci
npm run playwright:install
```

On WSL/Linux, the WSL build helper can create a repo-local Python virtualenv and run `npm ci` for you:

```bash
./scripts/build-wsl.sh --help
```

Enable GitHub Pages for the repository and publish the generated `docs/` directory from `main`, using either the repository Pages settings or the deployment workflow configured for this repository.

## Default checked-in/UI-only build

Use this for normal UI, CSS, JavaScript client, template, preset-library, and documentation work. It does not read the local Terra Invicta installation and does not regenerate the checked-in research or ship catalogs.

```powershell
npm run build
npm run verify
```

The default build runs:

```powershell
python scripts/rebuild_pages.py --ui-only --no-commit --no-push
```

`--ui-only` reuses the embedded chart data from the existing generated page. Pass `--input-html-data <path>` directly to `scripts/rebuild_pages.py` if you need to reuse embedded data from another generated HTML file.

For a faster local iteration that skips the build script's browser verification step:

```powershell
npm run build:fast
```

## Windows workflow

Recommended default Windows workflow:

```powershell
npm ci
npm run playwright:install
npm run build
npm run verify
```

Local Terra Invicta data rebuilds are explicit. Use them only when you intentionally want to refresh checked-in generated data from your local game install:

```powershell
npm run build:from-game -- --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates"
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
* runs the default checked-in/UI-only build without committing or pushing.

Skip the build script's browser verification when needed:

```bash
./scripts/build-wsl.sh --skip-verify
```

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

This repository has one local-game-data rebuild path. It reads the local Terra Invicta `Templates` directory and regenerates:

* `data/research_catalog.json`
* `docs/research_catalog.md`
* `data/ship_catalog.json`
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

The builder embeds template source names and the detected game version at the bottom of the page. Version detection uses `AIDump.txt` when available, falls back to the Steam appmanifest build id, and can be overridden with `--game-version`.

There is currently no separate full refresh or deep extraction mode in this repository. `--from-game` is the explicit full catalog rebuild. If a future workflow needs a more expensive extraction step, keep it behind a separately named option or script rather than adding it to the default build.

## Built-in presets

Built-in chart and dry-mass preset entries can be added to `data/preset_library.json`. The builder embeds `chartPresets` and `dryMassPresets` from that file into `docs/index.html`; use `--preset-library path\to\file.json` to build from a different preset library. Entries use the same shape as exported named presets: chart presets carry a `settings` object, and dry-mass design presets carry a `dryMassDesign` object plus optional `simulationDefaults`.

## Generated output and deployment scope

The deploy script only stages these generated files:

* `data/research_catalog.json`
* `docs/research_catalog.md`
* `data/ship_catalog.json`
* `docs/ship_catalog.md`
* `docs/index.html`
* `docs/assets/js`

Other local changes are left untouched.

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
