# Phase 02: Extract localization module and update imports

## Goal

- Extract dynamic language state and helper functions into `tools/drive_comparison_client/shared/i18n.js` while preserving existing language behavior.

## Scope

- Add `shared/i18n.js` with active language initialization from `document.documentElement.lang`, saved-language override from `localStorage`, `setUiLanguage()`, `currentLanguage()`, and `localText()`.
- Remove active language state, saved-language initialization, `setUiLanguage()`, and `localText()` definitions from `state/core.js`.
- Import `UI_LANG`, `setUiLanguage`, and `localText()` from `shared/i18n.js` wherever currently sourced from `state/core.js`.
- Keep `state/core.js` functions that still need localization (`translateText`, `applyStaticLanguage`, labels, summaries, radiator names) working by importing from `shared/i18n.js`.

## Non-goals

- Do not rename existing call sites or rewrite dynamic copy.
- Do not move `STATIC_TRANSLATIONS`, `NOTE_HTML`, `translateText()`, or `applyStaticLanguage()`.
- Do not change controller refresh order or chart/preset/dry-mass behavior.
- Do not edit generated files directly.

## Affected files

- `tools/drive_comparison_client/shared/i18n.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/app/controller.js`
- `tools/drive_comparison_client/calc/dry_mass_model.js`
- `tools/drive_comparison_client/calc/filtering.js`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_client/presets/common.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/ui/control_state.js`
- `tools/drive_comparison_client/ui/controls.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/drive_comparison_client/ui/searchable_select.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`

## Implementation steps

- Create `shared/i18n.js` with no imports.
- Update `state/core.js` to import dynamic language helpers and remove local definitions.
- Update direct caller imports so `UI_LANG` and `localText()` come from `shared/i18n.js`.
- Run targeted searches to confirm `state/core.js` no longer exports dynamic localization state/helper definitions and no caller imports those symbols from `state/core.js`.
- Run focused JS/import validation before broader build phase.

## Acceptance criteria

- `rg "export let UI_LANG|export function localText|export function setUiLanguage|savedLanguage" tools/drive_comparison_client/state/core.js` finds no moved definitions.
- `rg "UI_LANG|localText|setUiLanguage" tools/drive_comparison_client -g "*.js"` shows callers importing dynamic localization from `shared/i18n.js` or state-local use through imported helpers only.
- `shared/i18n.js` imports no modules.
- `npm run verify:js` passes.

## Validation commands

- `npm run verify:js`
- Targeted `rg` checks described above.

## Manual smoke tests

- Deferred to Phase 03 automated browser verification.

## Rollback risks

- Medium rollback risk because many import lists change; rollback is limited to reverting the new module plus import-list edits.

## Evidence

- Baseline: `localText()` and `UI_LANG` are defined in `state/core.js`; many source modules import them from `state/core.js`.
- After: Added dependency-free `shared/i18n.js`; removed `UI_LANG`, `savedLanguage`, `localText()`, and `setUiLanguage()` definitions from `state/core.js`; updated direct callers to import `UI_LANG`, `localText()`, and `setUiLanguage()` from `shared/i18n.js`.
- Delta: Dynamic localization state moved behind a shared module boundary without changing call sites or UI copy.
- Interpretation: Issue #44 source-level acceptance criteria are met before generated output refresh. Targeted searches found no moved definitions in `state/core.js`, no dynamic localization imports from `state/core.js`, and no imports in `shared/i18n.js`. `npm run verify:js` passed.
- Commit: Pending phase commit after this phase gate.
- Commit blocker: none known.

## Progress

- Completed.

## Decision log

- Kept `translateText()` and `applyStaticLanguage()` in `state/core.js` because they depend on embedded static translation data and DOM updates.
- Preserved existing direct `UI_LANG` read pattern by exporting it as a live ES module binding from `shared/i18n.js`.

## Outcomes / Retrospective

- Implemented and validated source-only localization extraction. Generated published UI output is deferred to Phase 03.
