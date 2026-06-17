# Agent Instructions

## Build Workflow Terms

- **Default build / UI-only / checked-in data build**: rebuilds `docs/index.html`
  and `docs/assets/js/**` from source files while reusing the checked-in embedded
  chart data from the existing generated page. This is the safe normal workflow
  for UI, CSS, client JavaScript, template, preset-library, and documentation
  changes. It does not read a local Terra Invicta installation.
- **Local-game-data rebuild**: explicitly reads a local Terra Invicta
  `TerraInvicta_Data/StreamingAssets/Templates` directory and regenerates the
  research catalog, ship catalog, generated Markdown catalog docs, dashboard,
  and published client assets.
- **Full refresh / deep extraction**: no separate deeper extraction workflow
  currently exists in this repository. If one is added later, keep it behind a
  clearly named explicit option or script and do not make it part of the default
  build.

## Graphify And Serena Workflow

This repository is large enough that Graphify usually adds structural value. Use `graphify-out/GRAPH_REPORT.md` as a navigation aid before broad refactors, unfamiliar feature work, cross-module changes, chart/preset/dry-mass/module-effect work, or tasks with unclear ownership. Trivial, obvious single-file documentation edits may skip Graphify.

Graphify is a map, not source of truth. Treat inferred or semantic edges as leads only; verify relationships in the actual source before editing or reviewing.

When Serena is available, prefer symbol and reference queries over loading whole large files. In particular, avoid reading generated `docs/index.html`, `docs/assets/js/**`, or large source modules when a focused symbol lookup, reference search, or small source slice is enough.

Suggested Graphify entry points:

- Chart interaction and rendering: `Chart Rendering`, `Chart Pointer Tools`, `Chart Viewport`, and `Axis Ticks`.
- Filtering, power, and module behavior: `Drive Filtering`, `Module Effects`, and `Core State`.
- Presets: `Preset Codec`, `Preset Importer`, and `UI Controls`.
- Dry mass and ship designer work: `Dry Mass Model` and `Ship Designer UI Docs`.
- Build and catalog work: `Dashboard Builder`, `Research Catalog`, `Template Loading`, `Build Workflow Policy`, `Source Ownership Docs`, and `WSL Build Script`.

## Generated and External Data

Treat these paths as opaque generated artifacts or parsed external data. Do not
open, inspect, summarize, or review their contents unless the user explicitly asks
for generated output, catalog content, deployment artifacts, or generator-debug
work:

- `docs/index.html`
- `docs/assets/js/**`
- `data/generated/research_catalog.json`
- `data/generated/ship_catalog.json`
- `docs/research_catalog.md`
- `docs/ship_catalog.md`

These files are regenerated from source code and Terra Invicta template data.
They may legitimately change after a build. Review the source builders or source
client modules instead of spending review budget on these generated artifacts.

## Source of Truth

- `tools/drive_comparison_client/**` is the source for the browser client.
  `docs/assets/js/**` is only the published copy.
- `tools/build_drive_comparison.py`, `tools/build_research_catalog.py`,
  `tools/build_ship_catalog.py`, and `scripts/rebuild_pages.py` own generated
  page and catalog output.
- `data/preset_library.json` is hand-maintained input data, not generated
  catalog output.
- `tools/drive_comparison_template.html`, `tools/drive_comparison_styles.css`,
  and `tools/drive_comparison_i18n.py` are source files for the generated page.

## Rebuild Workflow

For normal local builds after source changes that affect published output:

```powershell
npm run build
```

`npm run build` is intentionally a default checked-in/UI-only build. It should
not require local Terra Invicta templates or browser verification.

Run verification as a separate explicit step when needed:

```powershell
npm run verify
```

For WSL/Linux work, prefer the guarded helper:

```bash
./scripts/build-wsl.sh
```

The WSL helper creates or reuses `.venv-wsl/`, installs dependencies, rejects
Windows `.exe`/`.cmd` build tools leaking into WSL, and runs the safe default
checked-in/UI-only build without verification. `./scripts/build-wsl.sh --verify`
keeps the build script's optional Playwright browser verification path available,
but the normal validation command is still `npm run verify`.

Use local-game-data rebuilds only when the task explicitly requires refreshing
catalog data from a local Terra Invicta install. These rebuild commands also skip
verification by default; run `npm run verify` separately when needed:

```powershell
npm run build:from-game -- --templates-dir "C:\Program Files (x86)\Steam\steamapps\common\Terra Invicta\TerraInvicta_Data\StreamingAssets\Templates"
```

```bash
./scripts/build-wsl.sh --from-game \
  --templates-dir "/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates"
```

Use individual builders only when the task specifically targets one catalog:

- `python tools/build_research_catalog.py --templates-dir <Templates>`
- `python tools/build_ship_catalog.py --templates-dir <Templates>`
- `python tools/build_drive_comparison.py --templates-dir <Templates>`

Do not use `npm run deploy` for routine validation. It preserves the publishing
workflow and may commit and push generated files.

## Search and Review Scope

- Prefer searching source paths first: `tools/**`, `scripts/**`, `README.md`,
  `.github/**`, and `docs/dev/**`.
- Treat generated paths as opaque for routine work. If they appear in a diff,
  note only that generated artifacts changed when relevant; do not inspect their
  content or request changes based on generated-file churn alone.
- Exclude local dependency, cache, virtualenv, and test-output directories from
  routine agent work: `node_modules/**`, `.venv-wsl/**`, `.ti_cache/**`,
  `playwright-report/**`, `test-results/**`, `__pycache__/**`, and `*.pyc`.
