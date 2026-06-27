# Phase 03: UI localized metadata behavior

## Goal

- Use catalog-provided localized drive display names and descriptions in current chart row data and the right-side detail card without broad UI redesign.

## Scope

- Propagate localized drive `displayName`, raw/fallback display names, and `description` maps from the catalog into generated chart rows.
- Keep `row.displayName` compatible with current client string use while adding metadata fields needed for language-aware display.
- Update detail-card subtitle/body logic so localized descriptions appear under the title when available.
- Fall back to the existing category/family/project subtitle when no description exists.

## Non-goals

- Do not rewrite all `localText()` usage or translator workflow.
- Do not redesign the detail card.
- Do not change saved preset, pin, or localStorage schemas.
- Do not hardcode any drive-specific name mappings.

## Affected files

- `tools/build_drive_comparison.py`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- Potentially `tools/drive_comparison_client/state/core.js` if a shared label helper is needed.
- Expected regenerated `docs/index.html` and `docs/assets/js/**`

## Implementation steps

- Identify current detail-card title/subtitle rendering and row label helpers.
- Add or reuse language-aware helpers for drive display name and description maps.
- Prefer localized English display names at build time for current `row.displayName` compatibility, while retaining `rawDisplayName`, `displayNameLocalized`, or equivalent metadata.
- Render localized description text under the title/subtitle area when present for `UI_LANG`; otherwise render the existing category/family/project line.
- Validate missing localization fallback with generated data or fixture rows.

## Acceptance criteria

- Drive labels prefer localized catalog display names when available.
- Stable drive IDs remain unchanged.
- Detail cards show localized drive descriptions when available.
- Missing descriptions fall back to the existing category/family/project line and do not leave a blank area.
- Search/sort/table display continue to work with string `row.displayName` or updated compatible helpers.

## Validation commands

- `node tools/verify_drive_comparison_client_syntax.mjs`
- `npm run verify:js`
- Browser verification or focused DOM/assertion test if available.

## Manual smoke tests

- Inspect a row with a description and confirm the detail card displays it under the title area.
- Inspect a row without a description and confirm the old category/family/project fallback appears.
- Check table and chart labels remain usable and IDs are not shown as localized replacements.

## Rollback risks

- Client code assumes `row.displayName` is a string in several places; any map-based change must be backward-compatible or update all references.
- Long descriptions may affect detail-card layout; keep styling changes minimal and responsive.

## Evidence

- Baseline: detail-card subtitle is category/family/project oriented and no drive description field is available in row data.
- After: generated drive rows now include `rawDisplayName`, `displayNameLocalized`, `description`, `aliases`, and `rawBaseDisplayName`; `row.displayName` remains a string and prefers localized English when available. Client helpers choose localized labels/descriptions by `UI_LANG`.
- Delta: generated Poseidon sample has stable `id` `NeutronFluxLanternx1`, `rawDisplayName` `Neutron Flux Lantern x1`, `displayName` `Poseidon Lantern x1`, localized Korean/English names, localized Korean/English description, and aliases containing both raw and localized names. A generated row without description retains category/family/project fallback parts.
- Interpretation: localized display and description metadata reaches the UI while stable IDs and compatible string display fields remain intact.
- Commit: `b5281c2 feat: show localized drive metadata`.
- Commit blocker: none.

## Progress

- Implemented and phase gate passed.

## Decision log

- Decision: keep stable identity in `row.id`/`dataName`; display localization is presentation metadata only.
- Decision: keep `row.displayName` as a string for compatibility and add `displayNameLocalized` rather than replacing the existing field with a map.
- Decision: detail-card subtitle renders the localized description when present and otherwise renders the previous category/family/project text.

## Outcomes / Retrospective

- Implemented. Validation run: `python -m compileall -q tools scripts`; `npm run verify:js`; `npm run build`; targeted generated-data parser for localized Poseidon row and no-description fallback row.
