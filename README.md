# Terra Invicta Engine Charts

Standalone builder and GitHub Pages site for Terra Invicta engine comparison charts.

The generated Pages site lives in `docs/index.html`. The page includes a
language selector for Korean and English instead of generating one chart per
language.

The chart is generated from a local Terra Invicta install. It embeds the template
source names and the detected game version at the bottom of the page. Version
detection uses `AIDump.txt` when available, falls back to the Steam appmanifest
build id, and can be overridden with `--game-version`.

## Setup

```powershell
npm ci
npm run playwright:install
git remote add origin https://github.com/<owner>/<repo>.git
```

Enable GitHub Pages for the repository with GitHub Actions as the source. The
workflow in `.github/workflows/pages.yml` publishes the `docs/` directory on
pushes to `main`.

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

Built-in chart and dry-mass preset entries can be added to
`data/preset_library.json`. The builder embeds `chartPresets` and
`dryMassPresets` from that file into `docs/index.html`; use
`--preset-library path\to\file.json` to build from a different preset library.
Entries use the same shape as exported named presets: chart presets carry a
`settings` object, and dry-mass presets carry a `calculator` object.

The deploy script only stages these generated files:

- `data/research_catalog.json`
- `docs/research_catalog.md`
- `data/ship_catalog.json`
- `docs/ship_catalog.md`
- `docs/index.html`

Other local changes are left untouched.
