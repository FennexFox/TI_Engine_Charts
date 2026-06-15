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

## Generated and External Data

Treat these paths as generated artifacts or parsed external data. Do not inspect
or edit them unless the user explicitly asks for generated output, catalog
content, or deployment artifacts:

- `docs/index.html`
- `docs/assets/js/**`
- `data/research_catalog.json`
- `data/ship_catalog.json`
- `docs/research_catalog.md`
- `docs/ship_catalog.md`

These files are regenerated from source code and Terra Invicta template data.
Prefer changing the source builders or source client modules, then rebuild the
artifacts.

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

For normal local validation after source changes that affect published output:

```powershell
npm run build
npm run verify
```

`npm run build` is intentionally a default checked-in/UI-only build. It should
not require local Terra Invicta templates.

For WSL/Linux work, prefer the guarded helper:

```bash
./scripts/build-wsl.sh
./scripts/build-wsl.sh --skip-verify
```

The WSL helper creates or reuses `.venv-wsl/`, installs dependencies, rejects
Windows `.exe`/`.cmd` build tools leaking into WSL, and runs the safe default
checked-in/UI-only build.

Use local-game-data rebuilds only when the task explicitly requires refreshing
catalog data from a local Terra Invicta install:

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
- Avoid broad reads of `docs/index.html` and catalog JSON/Markdown outputs; they
  are large and mostly reproducible from source.
- Exclude local dependency, cache, virtualenv, and test-output directories from
  routine agent work: `node_modules/**`, `.venv-wsl/**`, `.ti_cache/**`,
  `playwright-report/**`, `test-results/**`, `__pycache__/**`, and `*.pyc`.
- Do not propose direct review comments on generated paths unless the generated
  output itself is the subject of the request. Trace issues back to the source
  builder or source client where possible.
