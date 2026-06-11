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

- [ ] Not started.

## Decision Log

- Decision: Add optional state fields before calculation integration.
  Reason: Persistence can be reviewed independently from behavioral math changes.
- Decision: Default to disabled/no-op.
  Reason: Existing drive comparison behavior must remain unchanged until users opt into module effects.

## Outcomes

- Pending.

