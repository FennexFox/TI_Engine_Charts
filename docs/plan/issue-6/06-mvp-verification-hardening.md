# Phase 06 - MVP Verification Hardening

## Goal

Lock the MVP behavior with deterministic and browser validations so future power, heat, and compatibility work can refactor safely.

## Scope

- Add focused tests for calculation parity and modified behavior.
- Extend browser verification for preset round trips, named preset persistence, and visible UI warnings.
- Verify chart/table/tooltip consistency for modified metrics.
- Verify legacy preset compatibility.
- Keep test fixtures small and deterministic.

## Non-Goals

- Do not add new feature behavior in this phase.
- Do not broaden to every utility module in the catalog.
- Do not require local Terra Invicta template files for normal verification.

## Affected Files

- `tools/verify_module_effects.mjs`
- `tools/verify_drive_comparison_browser.mjs`
- `tools/verify_drive_comparison_import_graph.mjs` only if a new boundary check is needed.
- `package.json` only if a new verify script is added.
- Optional fixture file under `tools/fixtures/` if inline fixtures become hard to read.

## Implementation Steps

1. Add no-op parity checks:
   - module effects disabled.
   - no selected module IDs.
   - selected modules with no supported rules.
2. Add deterministic calculation checks:
   - thrust multiplier changes effective thrust and TWR.
   - EV multiplier changes mass ratio, fuel mass, total mass, and max practical dV.
   - unsupported rules are reported.
   - unmet prerequisites are reported.
3. Extend browser `presetRoundTrip` coverage:
   - JSON export/import preserves module-effect fields.
   - compressed export/import preserves module-effect fields.
   - legacy payload without fields defaults safely.
4. Extend browser named preset coverage:
   - save named chart preset with module effects enabled.
   - reload or clear runtime state.
   - apply saved preset and confirm restored fields affect chart values.
5. Add UI assertions:
   - effect toggle renders.
   - active modifier summary renders.
   - warning text renders for unsupported/unmet effects.
6. Keep tests independent of generated template availability by relying on embedded `docs/index.html` data.
7. Run full verification after rebuild.

## Acceptance Criteria

- `npm run verify` passes.
- At least one deterministic test proves no-op parity.
- At least one deterministic test proves thrust modifier math.
- At least one deterministic test proves EV modifier math.
- Browser tests cover JSON and compressed preset round trips.
- Browser tests cover one legacy payload without new fields.
- Browser tests cover one saved named preset reload or equivalent reset/apply cycle.
- Existing browser tests for power-view modes, tooltip table, and dry-mass presets still pass.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

## Manual Smoke Tests

- Use a fresh browser profile or clear localStorage.
- Confirm default chart values look unchanged.
- Enable module effects, select one known spiker module, and inspect a compatible drive tooltip.
- Export current settings as JSON and compressed string; import both.
- Save a named preset, refresh, apply it, and confirm the same effect state returns.
- Import a legacy preset with no module-effect fields and confirm no warning or crash.

## Rollback Risks

- Browser tests can become brittle if they assert exact visual text instead of stable state and semantic values.
- Test fixtures can accidentally depend on a drive whose catalog metadata changes after a future data rebuild.
- Adding a new npm script can break environments where Node or Playwright assumptions differ.

## Progress

- [x] Added deterministic no-op parity checks for disabled module effects and unsupported-only module selections.
- [x] Added deterministic thrust summary checks for effective thrust, unchanged mass ratio/propellant/total mass, and increased TWR.
- [x] Added deterministic EV summary checks for mass ratio, propellant mass, total mass, and max practical dV.
- [x] Extended browser preset round-trip coverage for both encoded compressed payloads and plain JSON payloads.
- [x] Kept legacy payload coverage and verified missing module-effect fields reset to safe defaults.
- [x] Extended named chart preset coverage so restored module-effect fields must also affect chart mass/TWR values.
- [x] Confirmed existing UI warning assertions from Phase 05 remain in browser verification.
- [x] Validation passed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_drive_comparison_browser.mjs docs/index.html`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- [x] Manual smoke passed in a fresh Playwright browser context for default parity, compatible tooltip, JSON/compressed import, named preset reload/apply, and legacy import defaults.

## Decision Log

- Decision: Treat verification as its own phase.
  Reason: The MVP changes calculation, UI, and persistence together; a separate hardening pass keeps the implementation phases reviewable.
- Decision: Prefer embedded-page browser fixtures.
  Reason: Normal contributors should not need local Terra Invicta template files to validate this feature.
- Decision: Keep deterministic mass/TWR checks inside `tools/verify_module_effects.mjs` instead of adding a new fixture file.
  Reason: The fixture math is small, explicit, and easier to review inline.
- Decision: Verify JSON payloads with `JSON.stringify(exportedPreset())` and compressed payloads with the existing serializer.
  Reason: This exercises both parser paths without depending on clipboard or modal UI state.

## Outcomes

- MVP module-effect behavior is now locked by deterministic evaluator checks plus browser integration checks.
- Browser verification covers JSON and encoded preset payloads, legacy missing fields, named preset persistence, UI warnings, and restored chart-value effects.
- The phase did not add new product behavior or generated asset changes.

## Retrospective

- Most Phase 06 acceptance criteria were already partly covered by prior phases, so the final hardening stayed focused on explicit payload-format and no-op/math assertions.
- Keeping the checks fixture-based avoided broad catalog sweeps while still protecting the MVP contracts future phases will refactor.

