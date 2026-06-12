# Terra Invicta Engine Charts

GitHub Pages builder and static dashboard for Terra Invicta engine comparison charts.

The generated Pages site lives in `docs/index.html`. The page includes a language selector for Korean and English instead of generating one chart per language.

The chart is generated from a local Terra Invicta install. It embeds the template source names and the detected game version at the bottom of the page. Version detection uses `AIDump.txt` when available, falls back to the Steam appmanifest build id, and can be overridden with `--game-version`.

## Current dashboard features

* Compare Terra Invicta drives by research cost, total mass, propellant mass, TWR, thrust, efficiency, and power requirements.
* Adjust simulation assumptions such as dry mass, target dV, radiator type, engine count, minimum TWR, and module effects.
* Use the Dry Mass Calculator and built-in ship design presets to compare practical ship configurations.
* Inspect compatible power-plant steps, generated drive progression links, Pareto-dominated candidates, and impractical low-TWR or extreme-mass candidates.
* Save and load chart and dry-mass presets in browser local storage.
* Switch the interface between English and Korean from the dashboard itself.

## Setup

```powershell
npm ci
npm run playwright:install
git remote add origin https://github.com/<owner>/<repo>.git
```

Enable GitHub Pages for the repository and publish the generated `docs/` directory from `main`, using either the repository Pages settings or the deployment workflow configured for this repository.

## Rebuild Locally

Build and verify without committing:

```powershell
npm run build
```

Rebuild, verify, commit generated changes, and push:

```powershell
npm run deploy
```

Pass an explicit template directory or version when auto-detection is not enough:

```powershell
python .\scripts\rebuild_pages.py --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates" --game-version 1.0.32
```

Built-in chart and dry-mass preset entries can be added to `data/preset_library.json`. The builder embeds `chartPresets` and `dryMassPresets` from that file into `docs/index.html`; use `--preset-library path\to\file.json` to build from a different preset library. Entries use the same shape as exported named presets: chart presets carry a `settings` object, and dry-mass design presets carry a `dryMassDesign` object plus optional `simulationDefaults`.

The deploy script only stages these generated files:

* `data/research_catalog.json`
* `docs/research_catalog.md`
* `data/ship_catalog.json`
* `docs/ship_catalog.md`
* `docs/index.html`
* `docs/assets/js`

Other local changes are left untouched.