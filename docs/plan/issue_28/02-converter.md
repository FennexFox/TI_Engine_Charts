# Phase 02: Preset conversion script and documentation

## Goal

- Add a developer script that converts a normal exported preset JSON file into safe
  `data/preset_library.json` entries without hand-moving fields.

## Scope

- New CLI: `python tools/add_builtin_preset.py exported_preset.json`.
- Options for chart name, chart-only/design-only extraction, target preset library path, and
  predictable conflict handling.
- Extraction from `designPresetLibrary` and `dryMassPresetLibrary` into top-level
  `dryMassPresets`.
- Sanitization of generated chart settings by removing embedded design library snapshots.
- Rewriting `selectedDesignPresetId` when the selected exported design is mapped to a
  built-in source ID.
- Focused tests using temporary JSON files.
- README documentation for the developer workflow.

## Non-goals

- No in-browser UI for committing presets to the repository.
- No compressed clipboard payload parser in the Python script.
- No refresh of Terra Invicta catalog data.

## Affected files

- `tools/add_builtin_preset.py`
- `tools/test_add_builtin_preset.py` or equivalent focused validation
- `README.md`
- `data/preset_library.json` only when manually running the converter for real presets; this
  phase should not add sample built-in presets unless required for tests.
- `package.json` only if adding a script wrapper is useful and low-risk.

## Implementation steps

- Define converter input detection for named chart presets, raw chart settings, and design
  preset library payloads.
- Implement deterministic slug/source ID generation and conflict resolution.
- Load and validate the target preset library object.
- Normalize extracted design entries to the built-in source shape expected by the runtime.
- Sanitize chart settings and rewrite selected design references using the extracted/reused
  design ID map.
- Write formatted JSON atomically enough for local developer use.
- Add tests for snapshot stripping, selected design ID rewrite, duplicate handling, and
  formatted valid JSON.
- Document the command and common options in the README built-in preset section.

## Acceptance criteria

- A full exported chart preset JSON can be converted into one chart preset and extracted
  dry-mass/design presets.
- Generated chart settings contain no `designPresetLibrary` or `dryMassPresetLibrary`.
- `selectedDesignPresetId` is valid for the built-in runtime ID when the selected design was
  extracted or already exists.
- Duplicate IDs/names are handled predictably.
- Output JSON is formatted and valid.

## Validation commands

- python -m compileall -q tools/add_builtin_preset.py
- python tools/test_add_builtin_preset.py
- npm run build

## Manual smoke tests

- Run the converter against a temporary exported-preset fixture and inspect the reported
  added/reused entries.

## Rollback risks

- Removing the script and README section restores the previous manual workflow.
- Conflict handling must avoid overwriting existing built-in entries unless an explicit
  replace mode is added.

## Progress

- Added `tools/add_builtin_preset.py` with JSON input loading, built-in preset library
  validation, snapshot extraction, chart settings sanitization, selected design ID rewrite,
  and deterministic conflict handling.
- Added focused converter tests covering full chart exports, duplicate ID/name suffixing,
  existing built-in design reference rewrite, and design-library-only import.
- Documented the developer workflow and options in `README.md`.
- Wired the focused converter test into `npm run verify:python`.

## Decision log

- The script will operate on JSON files only; browser import/export keeps ownership of
  compressed clipboard strings.
- If neither `--chart` nor `--dry-mass-library` is passed, the script performs the core
  workflow: add a chart preset and extract design presets.
- Duplicate source IDs use stable numeric suffixes by default. `--on-conflict skip` reuses
  existing IDs, and `--on-conflict replace` overwrites matching IDs.
- Unmapped local `selectedDesignPresetId` values are removed from generated built-in chart
  settings instead of leaving invalid user-local references.

## Outcomes / Retrospective

- Phase 2 completed. The converter updates only the chosen preset library, keeps unsafe
  design snapshot arrays out of generated built-in chart settings, and emits formatted JSON.
- Validation passed:
  - `python -m compileall -q tools/add_builtin_preset.py`
  - `python tools/test_add_builtin_preset.py`
  - `npm run build`
