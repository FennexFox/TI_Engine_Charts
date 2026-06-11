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

- [ ] Not started.

## Decision Log

- Decision: Keep the evaluator independent from chart and tooltip code.
  Reason: Issue #6 explicitly asks to avoid hard-coding modifier behavior directly into chart rendering.
- Decision: Use warnings rather than silent ignores for unsupported rules.
  Reason: Users must know when selected modules are not represented.

## Outcomes

- Pending.

