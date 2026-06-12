# Phase 04 - MVP Thrust and EV Calculation

## Goal

Wire the pure evaluator into drive metric calculation so selected supported modules can modify thrust, TWR, exhaust velocity, propellant mass, total mass, and maximum practical dV.

## Scope

- Apply MVP module effects when module effects are enabled.
- Support:
  - `ThrustMultiplier`.
  - `EVMultiplier`.
- Apply prerequisite diagnostics from Phase 02.
- Keep base behavior identical when module effects are disabled.
- Preserve the current power demand and waste heat calculations as base values for now, with explicit diagnostics that power-side effects are not yet modeled.

## Non-Goals

- Do not modify power plant mass, power requirement, waste heat, or radiator mass yet.
- Do not implement mutual exclusivity or full compatibility validation yet.
- Do not add rich UI beyond any minimal debug-safe output needed for tests.

## Affected Files

- `tools/drive_comparison_client/calc/filtering.js`
- `tools/drive_comparison_client/calc/metrics.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/calc/module_effects.js`
- `tools/drive_comparison_client/ui/tooltip_table.js` only if it consumes effect summaries needed by tests.
- `tools/verify_drive_comparison_browser.mjs`
- `tools/verify_module_effects.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Add a small helper that resolves the effective drive row for calculations.
2. In `massOptions(row)`, use effective thrust and effective exhaust velocity only when module effects are enabled.
3. Recompute:
   - mass ratio from effective exhaust velocity.
   - propellant tons.
   - total mass tons.
   - TWR from effective thrust and total mass.
   - maximum practical dV from effective exhaust velocity.
4. Preserve existing `row.powerRequirementGW`, power plant mass, waste heat, and radiator mass behavior.
5. Add effect summary data onto returned mass option objects.
6. Update metric definitions for base metrics where appropriate:
   - modified thrust metric should show effective thrust when enabled.
   - fuel efficiency metric should show effective EV/Isp when enabled.
   - power requirement metric should remain base until Phase 07, with naming/warning handled by UI phase.
7. Extend fixture tests for no-op parity and modified calculations.
8. Extend browser tests to compare one known drive with:
   - no module effects.
   - thrust multiplier enabled.
   - EV multiplier enabled.

## Acceptance Criteria

- With module effects disabled, all chart and table values match the pre-phase behavior.
- A thrust multiplier changes effective thrust and TWR.
- An EV multiplier changes mass ratio, propellant mass, total mass, and maximum practical dV.
- Unmet prerequisites prevent application and create diagnostics.
- Unsupported selected rules are carried as diagnostics.
- Power demand and waste heat remain intentionally base values until follow-up phases.
- No circular imports are introduced.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_axis_ticks.mjs
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

## Manual Smoke Tests

- Open the app with module effects disabled and compare a familiar chart view.
- Enable module effects and select Antimatter Spiker on a compatible nuclear drive.
- Confirm TWR increases for compatible drives.
- Select a hydrogen tankage module and confirm total/fuel mass decreases for compatible hydrogen-propellant drives.
- Select an incompatible module and confirm calculations do not pretend the effect applies.
- Toggle the feature off and confirm chart values return to base behavior.

## Rollback Risks

- Applying EV before mass ratio calculation can change many chart values at once, so no-op parity tests are critical.
- Metric definitions currently read row fields directly for thrust and fuel efficiency; incomplete integration can make chart/table/tooltip disagree.
- Preserving base power demand while changing thrust or EV can look physically inconsistent unless the UI clearly labels the limitation.

## Progress

- [x] Added effective drive value resolution for module-effect-enabled chart calculations.
- [x] Wired `massOptions(row)` and mass-ratio diagnostics to effective thrust and exhaust velocity.
- [x] Preserved base power demand, power plant mass, waste heat, radiator mass, and drive mass.
- [x] Attached active effect summaries and diagnostics to returned mass option objects.
- [x] Routed thrust and fuel-efficiency metric definitions through the effective-value hook.
- [x] Kept tooltip performance values consistent with effective thrust and exhaust velocity.
- [x] Extended browser verification for disabled parity, thrust effects, EV effects, unmet prerequisites, unsupported rules, and base power preservation.
- [x] Rebuilt generated UI assets.
- [x] Ran validation commands and manual smoke tests.

## Decision Log

- Decision: Keep power demand unchanged in the MVP calculation.
  Reason: Issue #6 lists power demand as follow-up scope and the first pass should remain narrow.
- Decision: Attach effect summaries to calculated options.
  Reason: Tooltips and warnings can consume summaries without re-evaluating module behavior.
- Decision: Register `effectiveDriveValues(row)` through the existing metric calculation hook pattern.
  Reason: `state/core.js` metric definitions can use effective thrust and EV without importing calculation modules directly or adding an import cycle.
- Decision: Recompute module effects on demand instead of caching them.
  Reason: Module assumptions can change through dry-mass selections, manual preset fields, and preset import; recomputation is simpler and avoids invalidation bugs for the MVP.
- Decision: Add an explicit `powerSideEffects` diagnostic while preserving base power fields.
  Reason: Later UI phases can explain that thrust/EV effects are active while power demand, power plant mass, waste heat, and radiator mass are still base values.
- Decision: Update tooltip performance rows to use effective thrust and exhaust velocity.
  Reason: Once chart metrics use effective values, the detail surface should not show contradictory base thrust/EV values.

## Outcomes

- Added `moduleEffectEvaluationForDrive(row)` and `effectiveDriveValues(row)` in `tools/drive_comparison_client/calc/filtering.js`.
- `massOptions(row)` now uses effective exhaust velocity for mass ratio, propellant mass, total mass, and maximum practical dV when module effects are enabled.
- `massOptions(row)` now uses effective thrust for TWR when module effects are enabled.
- Disabled module effects preserve previous base behavior.
- Power-side values remain base values and include diagnostics stating that power demand, power plant mass, waste heat, and radiator mass are preserved.
- `metricDefs.thrustMN` and `metricDefs.fuelEfficiency` now read effective values through registered metric hooks.
- Tooltip performance details now display effective thrust and exhaust velocity.
- Debug hooks expose effective-value helpers for verification.
- `tools/verify_drive_comparison_browser.mjs` now verifies:
  - disabled parity.
  - thrust multiplier TWR increase.
  - EV multiplier propellant/total mass reduction and max practical dV increase.
  - unmet prerequisite skip diagnostics.
  - unsupported rule diagnostics.
  - power-side base-value diagnostics.
  - effective thrust and fuel-efficiency metric values.
- Generated UI assets under `docs/assets/js/` were rebuilt.
- Validation passed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_axis_ticks.mjs`
  - `node tools/verify_drive_comparison_client_syntax.mjs`
  - `node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- Manual smoke passed in Playwright:
  - Compared a familiar drive with module effects disabled.
  - Enabled Antimatter Spiker on a compatible nuclear drive and confirmed TWR increased.
  - Enabled Hydron Trap on a hydrogen-propellant drive and confirmed total/fuel mass decreased.
  - Enabled an incompatible Muon Spiker on a fission drive and confirmed the effect did not apply.
  - Toggled module effects off and confirmed values returned to base behavior.

## Retrospective

- Reusing the existing metric hook avoided a state-to-calc import cycle and kept Phase 04 scoped to calculation plumbing.
- The main residual risk is user comprehension: active thrust/EV effects now change numbers while power demand stays base. Phase 05 should surface warnings and source controls clearly before this becomes normal user-facing workflow.

