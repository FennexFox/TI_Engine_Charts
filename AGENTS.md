# Agent Instructions

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

After source changes that affect published output, regenerate artifacts with one
of these commands:

```powershell
npm run build
```

For source-only UI changes when local Terra Invicta templates are unavailable:

```powershell
python scripts/rebuild_pages.py --ui-only --skip-verify --no-commit --no-push
```

Use individual builders only when the task specifically targets one catalog:

- `python tools/build_research_catalog.py`
- `python tools/build_ship_catalog.py`
- `python tools/build_drive_comparison.py`

## Search and Review Scope

- Prefer searching source paths first: `tools/**`, `scripts/**`, `README.md`,
  `.github/**`, and `docs/dev/**`.
- Avoid broad reads of `docs/index.html` and catalog JSON/Markdown outputs; they
  are large and mostly reproducible from source.
- Exclude local dependency, cache, and test-output directories from routine
  agent work: `node_modules/**`, `.ti_cache/**`, `playwright-report/**`,
  `test-results/**`, `__pycache__/**`, and `*.pyc`.
- Do not propose direct review comments on generated paths unless the generated
  output itself is the subject of the request. Trace issues back to the source
  builder or source client where possible.
