# Phase 03 - State and Preset Plumbing

## Goal

Add chart-state and preset plumbing for module-effect assumptions while keeping default behavior unchanged.

## Scope

- Add explicit state for module-effect assumptions.
- Decide whether chart calculations use:
  - the current dry-mass calculator selection.
  - a saved design preset selection.
  - an explicit copied list of module IDs.
- Export and import that state in chart presets.
- Preserve dry-mass preset compatibility.
- Keep the effect application disabled or no-op until Phase 04.

## Non-Goals

- Do not change chart calculations yet.
- Do not add full UX beyond minimal hidden/default-safe state wiring.
- Do not change the saved localStorage key names.
- Do not require existing presets to contain new fields.

## Affected Files

- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/presets/repository.js`
- `tools/drive_comparison_client/calc/dry_mass_model.js`
- `tools/drive_comparison_client/diagnostics/debug.js`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Add a default state shape such as:
   - `moduleEffectsEnabled: false`.
   - `moduleEffectModuleIds: []`.
   - `moduleEffectSource: "dryMassCalculator"` or `"manual"`.
2. Add a helper to derive selected utility module IDs from `dryMassCalcState.slotModules`.
3. Add a helper that produces the currently active module-effect assumptions.
4. Include new state fields in `chartDefaultState()` and reset logic.
5. Include new fields in `exportedPreset()`.
6. Accept new fields in `applyPresetToState()` with strict validation and safe defaults.
7. Ensure chart preset import/export round trips the fields.
8. Ensure old presets without these fields import exactly as before.
9. Add browser verification for old-preset import and new-field round trip.

## Acceptance Criteria

- Old chart presets import successfully without module-effect fields.
- New chart preset exports include validated module-effect assumption fields.
- New chart preset imports restore those fields.
- Existing dry-mass design preset format remains compatible.
- The chart still uses base drive metrics because Phase 04 has not integrated calculations.
- No localStorage key names change.

## Validation Commands

```powershell
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_drive_comparison_browser.mjs
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

## Manual Smoke Tests

- Export current chart settings and inspect JSON mode.
- Import that exported payload and confirm controls return to the same values.
- Import an older preset payload without module-effect fields and confirm no warnings or crashes.
- Save a named chart preset, reload the page, and apply it.
- Open dry-mass presets and confirm design preset save/import behavior is unchanged.

## Rollback Risks

- Bad state names can become persistent payload compatibility debt.
- If imported module IDs are not validated, corrupted presets can break later calculations.
- If state depends directly on dry-mass UI DOM instead of data state, startup preset application can become order-dependent.

## Progress

- [x] Added default-safe module-effect state fields.
- [x] Added helpers for dry-mass selected utility IDs, manual ID validation, and active assumptions.
- [x] Included module-effect fields in chart preset export.
- [x] Added strict import validation and safe defaults for old presets.
- [x] Exposed read-only helpers through debug hooks.
- [x] Extended browser verification for old preset import and new-field round trips.
- [x] Rebuilt generated UI assets.
- [x] Ran validation commands and manual smoke tests.

## Decision Log

- Decision: Add optional state fields before calculation integration.
  Reason: Persistence can be reviewed independently from behavioral math changes.
- Decision: Default to disabled/no-op.
  Reason: Existing drive comparison behavior must remain unchanged until users opt into module effects.
- Decision: Store only `moduleEffectsEnabled`, `moduleEffectSource`, and `moduleEffectModuleIds` in chart presets.
  Reason: The active module list can be derived from the dry-mass calculator when the source is `dryMassCalculator`, so duplicating it would create stale payload data.
- Decision: Use `dryMassCalculator` and `manual` as the initial source values.
  Reason: Existing chart presets already carry dry-mass calculator state and selected design preset snapshots, while manual IDs cover future explicit-copy workflows.
- Decision: Reset missing module-effect preset fields to safe defaults during import.
  Reason: Old presets should not accidentally inherit a previously enabled experimental state.
- Decision: Validate module IDs against the generated utility module catalog and drop `Empty`, unknown IDs, and duplicates.
  Reason: Later effect application should not have to handle corrupted or non-buildable placeholder IDs from persisted chart presets.

## Outcomes

- Added module-effect state defaults in `tools/drive_comparison_client/state/core.js`.
- Added helpers:
  - `normalizeModuleEffectSource`.
  - `normalizeModuleEffectModuleIds`.
  - `selectedDryMassUtilityModuleIds`.
  - `normalizeModuleEffectPresetState`.
  - `applyModuleEffectPresetState`.
  - `currentModuleEffectAssumptions`.
- Updated chart preset export/import in `tools/drive_comparison_client/presets/library.js`.
- Updated debug exposure in `tools/drive_comparison_client/diagnostics/debug.js`.
- Extended `tools/verify_drive_comparison_browser.mjs` for:
  - validated module-effect field export.
  - new-field preset round trip.
  - old-preset safe defaults.
  - dry-mass source ID derivation.
  - named chart preset restoration.
- Rebuilt generated UI assets under `docs/assets/js/`, including the generated copy of the Phase 02 evaluator.
- Validation passed:
  - `node tools/verify_drive_comparison_client_syntax.mjs`
  - `node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings`
  - `node tools/verify_drive_comparison_browser.mjs`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- Manual smoke passed in Playwright:
  - Inspected JSON export payload for module-effect fields.
  - Imported the exported payload and confirmed controls/state restored.
  - Imported an old preset payload without module-effect fields and confirmed safe defaults.
  - Saved a named chart preset, opened a fresh page, and applied it.
  - Saved/imported dry-mass presets and confirmed design preset behavior still works.
  - Confirmed chart mass options remain unchanged while module-effect state is enabled.

## Retrospective

- Keeping source selection as state instead of UI made this phase small and independently reviewable.
- The remaining risk is semantic: `manual` IDs are persisted before there is a user-facing editor. Phase 05 should ensure users can understand and change the source before effects are enabled in normal workflows.

