# Phase 02 - Pure Effect Evaluator

## Goal

Introduce a testable pure calculation layer that evaluates selected module effects against a drive row and returns effective drive values plus diagnostics, without changing the live chart yet.

## Scope

- Add a pure module-effect evaluator under `tools/drive_comparison_client/calc/`.
- Evaluate selected utility module IDs or module objects.
- Return:
  - effective thrust.
  - effective exhaust velocity.
  - effective specific impulse.
  - active effect summaries.
  - unsupported effect warnings.
  - unmet prerequisite warnings.
- Keep `massOptions(row)` behavior unchanged in this phase.

## Non-Goals

- Do not wire the evaluator into chart rendering yet.
- Do not add UI controls yet.
- Do not persist module-effect assumptions yet.
- Do not model power demand, waste heat, or radiator mass changes yet.

## Affected Files

- New file: `tools/drive_comparison_client/calc/module_effects.js`
- `tools/drive_comparison_client/calc/dry_mass_model.js` only if helper exports are needed for selected module lookup.
- `tools/drive_comparison_client/diagnostics/debug.js` only if read-only debug exposure is useful.
- New or extended verification script, for example `tools/verify_module_effects.mjs`
- `package.json` only if a new verification command is added.

## Implementation Steps

1. Add `module_effects.js` with no UI imports.
2. Export a function similar to `evaluateModuleEffectsForDrive(row, modules, options = {})`.
3. Use `DATA.shipCatalog.utilityModules` or caller-provided module objects to resolve module IDs.
4. Implement MVP effect accumulation:
   - multiply thrust by each applicable `thrustMultiplier`.
   - multiply exhaust velocity by each applicable `exhaustVelocityMultiplier`.
   - recompute specific impulse from effective exhaust velocity.
5. Implement prerequisite checks as diagnostics:
   - fission/fusion/nuclear drive family or classification checks.
   - hydrogen propellant check.
   - non-ISRU drive check.
6. Return base values and effective values in the same result object.
7. Include unsupported raw rules in diagnostics.
8. Add deterministic fixture checks for:
   - no selected modules.
   - one thrust multiplier.
   - one EV multiplier.
   - multiple compatible modifiers.
   - unmet prerequisite.
   - unsupported rule.
9. Keep import graph direction aligned with `docs/dev/native-esm-architecture.md`.

## Acceptance Criteria

- The evaluator is pure and deterministic.
- No DOM access exists in the evaluator.
- No chart rendering module imports the evaluator in this phase.
- No app behavior changes when running the browser app.
- Fixture checks prove supported modifiers and warnings are represented correctly.
- `node tools/verify_drive_comparison_import_graph.mjs` still reports zero circular imports.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings
npm run verify
```

## Manual Smoke Tests

- Open the app and compare a known drive row before and after the phase.
- Select spiker and tankage modules in the dry-mass calculator.
- Confirm dry mass changes as before, but chart metrics still do not change.
- Use browser console/debug hook only if exposed to inspect evaluator output for a selected drive.

## Rollback Risks

- The evaluator may infer drive classes incorrectly from current row fields.
- If prerequisite logic is too strict in this phase, later MVP application may incorrectly warn instead of apply.
- Adding a new verification script can make CI fail if it depends on local-only template data.

## Progress

- [x] Added a dependency-free pure evaluator under `calc/`.
- [x] Added module object and caller-provided utility catalog ID resolution.
- [x] Implemented thrust and exhaust-velocity multiplier accumulation.
- [x] Added prerequisite, unresolved module, skipped effect, unsupported effect, and unmodeled-rule diagnostics.
- [x] Added deterministic fixture verification for supported modifiers, unmet requirements, unsupported rules, raw fallback, and ID resolution.
- [x] Ran phase validation commands and browser smoke.

## Decision Log

- Decision: Keep the evaluator independent from chart and tooltip code.
  Reason: Issue #6 explicitly asks to avoid hard-coding modifier behavior directly into chart rendering.
- Decision: Use warnings rather than silent ignores for unsupported rules.
  Reason: Users must know when selected modules are not represented.
- Decision: Keep `module_effects.js` dependency-free instead of importing `state/core.js` or `dry_mass_model.js`.
  Reason: The evaluator should stay pure, DOM-free, and easy to test in Node without localStorage or browser globals.
- Decision: Resolve string module IDs only from a caller-provided `utilityModules` or `moduleCatalog` option.
  Reason: This supports future runtime wiring without coupling this phase to global app state.
- Decision: Add `verify:effects` and include it in `verify:js`.
  Reason: The new pure calculation layer should be covered by the standard verification command while remaining independent from local template data.
- Decision: Do not expose the evaluator through the debug hook in this phase.
  Reason: The phase acceptance criteria only require the pure layer and fixture checks; runtime exposure belongs with later state/UI wiring.

## Outcomes

- Added `tools/drive_comparison_client/calc/module_effects.js`.
- Added `tools/verify_module_effects.mjs`.
- Updated `package.json` so `npm run verify:js` runs `verify:effects`.
- The evaluator returns base and effective thrust, exhaust velocity, and specific impulse; active effect summaries; total multipliers; and diagnostics for unresolved modules, unmet requirements, skipped effects, unsupported effects, and unmodeled raw rules.
- The evaluator currently supports `thrustMultiplier` and `exhaustVelocityMultiplier` and checks fission, fusion, nuclear, hydrogen propellant, and non-ISRU prerequisites.
- No chart, tooltip, dry-mass UI, preset, or `massOptions(row)` runtime wiring was added.
- Validation passed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_drive_comparison_client_syntax.mjs`
  - `node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings`
  - `npm run verify`
- Manual smoke passed in Playwright:
  - Opened the app.
  - Captured a known drive row's chart mass options.
  - Selected Muon Spiker and Hydron Trap in the dry-mass calculator.
  - Confirmed dry mass changed from `178 t` to `228 t`.
  - Confirmed chart mass options remained unchanged.

## Retrospective

- The dependency-free evaluator avoided import graph churn and made fixture tests straightforward.
- The main residual risk is conservative drive-family inference from existing row fields; phase 04 should validate the warnings against real rows before applying the effective values to chart metrics.
