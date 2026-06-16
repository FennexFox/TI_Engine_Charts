# Phase 01: Source UI and state sync

## Goal

- Add the mission dV preset control to source UI and keep it synchronized with `state.targetDvKps`, the Target dV slider, the Target dV number input, localization, chart preset restore, and dry-mass design default restore.

## Scope

- Add `Mission dV preset` markup directly below the existing Target dV split control in Simulation Conditions.
- Add the nine issue-listed mission options and a `Custom` option.
- Lower the Target dV range input maximum from `2000` to `1000`.
- Update source JavaScript so selecting a mission preset writes only `state.targetDvKps`, syncs both Target dV inputs, updates the mission select, and renders.
- Update manual Target dV input handlers so non-exact values select `Custom` and exact mission values select the matching mission.
- Update preset/runtime state sync so external state changes also refresh the mission select.
- Add Korean/English static translation coverage for the new label and options.

## Non-goals

- Do not add chart presets for missions.
- Do not alter dry mass, radiator, filters, categories, families, selected metric, power view, module effects, or ship design assumptions from the mission select handler.
- Do not change Terra Invicta catalog extraction or generated catalog data.
- Do not hand-edit generated `docs/index.html` or `docs/assets/js/**`.

## Affected files

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client/ui/controls.js`
- `tools/drive_comparison_client/presets/runtime.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/main.js`
- `tools/drive_comparison_i18n.py`

## Implementation steps

- Add template markup for a labeled select under the Target dV input pair.
- Add a source mission preset list with stable values: 2, 4, 8, 20, 30, 50, 150, 200, and 500 km/s.
- Add helpers to sync the mission select from `state.targetDvKps` using exact numeric equality.
- Route mission select changes through a helper that updates Target dV inputs and calls `render()`.
- Route both manual Target dV input handlers through the same select sync helper.
- Expose the select sync helper through the preset runtime API so `syncUiFromState()` refreshes it after chart preset, import, startup, and dry-mass design default state changes.
- Add translation pairs for `Mission dV preset`, `Custom`, and every mission label.

## Acceptance criteria

- The new control appears directly near Target dV in Simulation Conditions.
- Selecting every mission option can update `state.targetDvKps` to the listed issue value without touching unrelated state.
- `#targetDv` and `#targetDvNumber` match the selected mission value when the value is inside the slider range.
- Manual Target dV edits set the select to `Custom` unless the numeric value exactly equals a mission preset.
- Manual exact matches select the matching mission option.
- Target dV slider max is 1000 while the Target dV number input remains wider.
- Chart preset and dry-mass design default sync paths update the mission select.
- Korean and English UI strings are covered by source translation data.

## Validation commands

- npm run verify:js

## Manual smoke tests

- Open the page after a build and verify `Mission dV preset` appears under Target dV.
- Select `Jupiter Assault`; Target dV slider and number should both show 50.
- Type 51 in the Target dV number input; mission select should show `Custom`.
- Type 150 in the Target dV number input; mission select should show `Fast Asteroid Assault`.
- Confirm language switching displays English and Korean labels.

## Rollback risks

- Low rollback risk: remove the select markup, mission sync helper, runtime callback, and translation entries.
- Main behavioral risk is stale select state when Target dV changes outside direct input handlers; mitigated by runtime sync from `syncUiFromState()`.
- Slider max reduction could surprise users who used the range above 1000; number input remains the manual path for larger values.

## Evidence

- Baseline: Issue #48 body reviewed; existing Target dV handlers directly set `state.targetDvKps` and call `render()`; existing range max is 2000 and number input max is 100000.
- After: Source markup adds `#missionDvPreset` under Target dV; Target dV range max is 1000; source controls expose exact mission-value sync and route chart preset/import state sync through the preset runtime API; translation pairs cover the new label and all options.
- Delta: Mission preset changes are source-only in this phase. Manual Target dV handlers now reuse a shared target dV sync helper, and `syncUiFromState()` now refreshes the mission select through `presetRuntimeApi.syncMissionDvPresetControl()`.
- Interpretation: Source behavior is implemented and static checks pass. Manual/browser behavior is deferred to phases 2 and 3 because checked-in generated UI assets have not been rebuilt yet.
- Validation: `npm run verify:js` passed; extra `npm run verify:python` passed because this phase changed `tools/drive_comparison_i18n.py`.
- Manual smoke tests: Not run in this phase; browser smoke is planned after automated browser coverage and rebuilt UI output.
- Commit: 97ded6b (`feat: add mission dv preset control`).
- Commit blocker: None; staging is limited to issue #48 plan/source files.

## Progress

- Source implementation complete; `npm run verify:js` and extra `npm run verify:python` passed; phase gate passed; committed in 97ded6b.

## Decision log

- Treat the user's slider cap request as lowering the Target dV range input max to 1000 while preserving the wider number input.
- Added a scoped `.mission-dv-preset-label` spacing rule so the new select reads as part of the Target dV control without crowding the slider.

## Outcomes / Retrospective

- Implemented source UI and state synchronization. Browser-level behavior and generated output remain for later phases.
