# Phase 01: Catalog generator and schema

## Goal

- Add a normalized drive catalog generation path that reads local Terra Invicta templates/localization during explicit from-game refreshes and writes `data/generated/drive_catalog.json`.

## Scope

- Implement `tools/build_drive_catalog.py` or equivalent source module.
- Normalize drive, power plant, and radiator template fields currently needed by `tools/build_drive_comparison.py`.
- Resolve `TIDriveTemplate.displayName.<dataName>` and `TIDriveTemplate.description.<dataName>` for configured languages.
- Preserve raw/fallback names separately from localized display maps.
- Include source fingerprints and detected game version metadata where available.

## Non-goals

- Do not add raw template or localization files.
- Do not alter chart/client behavior in this phase except through shared helper extraction required by the catalog builder.
- Do not localize all UI copy or implement issue #51.

## Affected files

- `tools/build_drive_catalog.py`
- `tools/build_drive_comparison.py` only if shared normalization helpers need to be extracted without behavior changes.
- `tools/catalog_utils.py` only for small reusable localization/catalog helpers.
- `data/generated/drive_catalog.json`

## Implementation steps

- Define catalog schema version and top-level sections for `drives`, `powerPlants`, `radiators`, `source`, and `counts`.
- Load `TIDriveTemplate.json`, `TIPowerPlantTemplate.json`, and `TIRadiatorTemplate.json` with existing template helpers.
- Load localization files from the sibling `Localization/<language>/TIDriveTemplate.<language>` paths.
- Normalize only app-needed fields used by the chart builder, plus raw display, localized display, localized description, aliases/fallback metadata, disable/alien flags, and source metadata.
- Add CLI args consistent with existing catalog builders: `--templates-dir`, `--json-output`, `--languages`, and `--game-version` if needed.
- Generate a fixture or small temporary input smoke test if no local game install is available.

## Acceptance criteria

- `data/generated/drive_catalog.json` exists or can be generated with the documented command.
- The catalog includes drive, power plant, and radiator records with stable `dataName` identifiers.
- Drive records include separate raw/fallback display text and localized `displayName`/`description` maps when localization is available.
- Missing localization produces empty maps or fallback fields without failing generation.
- Source metadata records template files/fingerprints and game version data where available.

## Validation commands

- `python -m compileall -q tools scripts`
- `python tools/build_drive_catalog.py --help`
- Fixture-based `python tools/build_drive_catalog.py --templates-dir <fixture> --json-output <tempfile> --languages en`

## Manual smoke tests

- Inspect one fixture/generated drive record for `dataName`, raw display, localized display, and localized description separation.
- Confirm raw templates/localization files were not copied into the repo.

## Rollback risks

- If schema fields do not cover all chart-builder needs, Phase 2 may require schema migration before consumption.
- If generated catalog diffs are produced from stale local game data, record the game version and avoid claiming game-data freshness.

## Evidence

- Baseline: no `data/generated/drive_catalog.json`; chart builder reads drive/power/radiator templates directly or reuses `docs/index.html` embedded data.
- After: added `tools/build_drive_catalog.py`; generated `data/generated/drive_catalog.json` from `/mnt/c/Program Files (x86)/Steam/steamapps/common/Terra Invicta/TerraInvicta_Data/StreamingAssets/Templates`.
- Delta: generated catalog reports 541 drives, 523 enabled drives, 61 power plants, 13 radiators, game version `1.0.38`, localization languages `kor,en`; targeted parser found 541 localized drive names and 96 localized descriptions.
- Interpretation: Phase 1 meets the catalog-generation and localization-metadata requirements. The Poseidon/Neutron Flux sample preserves `dataName` `NeutronFluxLanternx1` and raw display `Neutron Flux Lantern x1` while adding localized English `Poseidon Lantern x1` and Korean `포세이돈 등 x1`.
- Commit: pending phase gate.
- Commit blocker: none.

## Progress

- Implemented. Phase gate pending.

## Decision log

- Decision pending: exact schema will follow existing research/ship catalog conventions while preserving current chart row inputs.
- Decision: catalog schema version 1 uses top-level `drives`, `powerPlants`, `radiators`, `source`, and `counts`; each normalized record keeps `dataName`, raw display, aliases, app-needed numeric fields, and selected source template fields instead of vendoring full raw template files.
- Decision: only drive template localization is included in this phase because issue #53 explicitly names `TIDriveTemplate.displayName.*` and `TIDriveTemplate.description.*`; power/radiator localization can be a follow-up if needed.

## Outcomes / Retrospective

- Implemented. Validation run: `python -m compileall -q tools scripts`; `python tools/build_drive_catalog.py --help`; fixture generation with localized display/description; real catalog generation from local Terra Invicta templates.
