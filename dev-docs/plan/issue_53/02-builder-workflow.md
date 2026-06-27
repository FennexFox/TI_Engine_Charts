# Phase 02: Builder and rebuild workflow consumption

## Goal

- Make the page builder consume repo-local generated catalogs for normal builds and make from-game rebuilds regenerate the drive catalog.

## Scope

- Add `data/generated/drive_catalog.json` to rebuild workflow constants and generated-path tracking.
- Update from-game rebuild flow to run the drive catalog builder.
- Update default/UI-only build flow so it calls `tools/build_drive_comparison.py` with generated catalog inputs rather than `--input-html-data docs/index.html`.
- Update `tools/build_drive_comparison.py` to accept a `--drive-catalog` path and build chart data from the catalog plus research/ship catalogs.
- Keep a clearly named compatibility escape hatch for embedded HTML data only if still needed for explicit legacy/debug workflows.

## Non-goals

- Do not make normal builds read local Terra Invicta templates.
- Do not remove local-game-data rebuild support.
- Do not change preset/localStorage identity semantics.
- Do not broaden catalog generation beyond issue #53 needs.

## Affected files

- `scripts/rebuild_pages.py`
- `tools/build_drive_comparison.py`
- `package.json` only if script flags need to change.
- `data/generated/drive_catalog.json`
- Expected regenerated `docs/index.html` and `docs/assets/js/**`

## Implementation steps

- Add default `drive_catalog.json` path constants.
- Add a `--drive-catalog` CLI argument to `tools/build_drive_comparison.py`.
- Refactor `build_data` or add an adapter so existing chart row assembly uses catalog records instead of raw templates.
- Preserve current row fields, stable IDs, sorting, drive links, power options, radiator defaults, and source metadata semantics.
- Adjust `scripts/rebuild_pages.py`: from-game builds regenerate research, ship, and drive catalogs; default builds pass all generated catalogs to the page builder.
- Remove `docs/index.html` as the default input for `npm run build`.

## Acceptance criteria

- `npm run build` succeeds without a local Terra Invicta templates directory and without reading `docs/index.html` embedded `DATA`.
- `npm run build:from-game -- --templates-dir <Templates>` regenerates `data/generated/drive_catalog.json` before building the page.
- Existing drive row IDs remain raw `dataName` values.
- Existing chart calculations and compatible power/radiator behavior are preserved except for intended localized display metadata.
- Source metadata in generated chart data references repo-local generated catalogs for normal builds.

## Validation commands

- `python -m compileall -q tools scripts`
- `npm run build`
- Focused command with `tools/build_drive_comparison.py --drive-catalog data/generated/drive_catalog.json --research-catalog data/generated/research_catalog.json --ship-catalog data/generated/ship_catalog.json --output <tempfile>`

## Manual smoke tests

- Check command output/source metadata to confirm normal build uses catalog paths and not `docs/index.html`.
- Compare representative generated drive count and stable IDs before/after.

## Rollback risks

- Refactoring data assembly may affect chart behavior; keep adapter changes narrow and validate row shape.
- If checked-in catalog data is stale or missing, normal build will fail by design until Phase 1 output is committed.

## Evidence

- Baseline: `scripts/rebuild_pages.py --ui-only` extends `--input-html-data docs/index.html`; `tools/build_drive_comparison.py` requires templates or embedded HTML data.
- After: pending.
- Delta: pending.
- Interpretation: pending.
- Commit: pending.
- Commit blocker: pending.

## Progress

- Not started.

## Decision log

- Decision pending: whether to keep `--input-html-data` as explicit legacy/debug path after normal build stops using it.

## Outcomes / Retrospective

- Not completed yet.
