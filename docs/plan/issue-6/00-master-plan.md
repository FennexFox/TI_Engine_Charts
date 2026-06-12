# Issue 6 Master Plan: Module-Based Engine Effects

Issue: https://github.com/FennexFox/TI_Engine_Charts/issues/6

## Objective

Add module-based drive, power, and waste-heat effects without turning the app into a full Terra Invicta ship designer. The refactor should keep current drive comparison behavior unchanged when no module effects are selected, preserve existing dry-mass preset compatibility, and make every applied or ignored module effect visible to users.

## Current Repository Findings

- The app is a native browser ES module app. Source modules live in `tools/drive_comparison_client/` and are copied to `docs/assets/js/` by `scripts/rebuild_pages.py`.
- `tools/build_ship_catalog.py` already preserves utility module `specialModuleRules` as `specialRules` and `specialModuleValue` as `specialValue` in `data/ship_catalog.json`.
- Current generated utility module rule inventory includes MVP-relevant rules:
  - `ThrustMultiplier`: 4 modules.
  - `EVMultiplier`: 5 modules.
  - Prerequisite-like rules such as `RequiresFissionDrive`, `RequiresFusionDrive`, `RequiresHydrogenPropellant`, `RequiresNuclearDrive`, and `RequiresNonISRUDrive`.
  - Follow-up rules such as `LaserPowerBonus`, `ParticleBeamPowerBonus`, module `powerRequirementMW`, `RotationalThrust`, `Magazine`, `TargetingComputer`, `ECM`, and many non-engine rules.
- Current calculation center is `tools/drive_comparison_client/calc/filtering.js`, especially `massOptions(row)`.
- Build-time power candidate shaping happens in `tools/build_drive_comparison.py`, especially drive row construction, compatible power sequence selection, and efficiency frontier pruning.
- Current metric definitions in `tools/drive_comparison_client/state/core.js` read base row fields for base metrics and call metric calculation hooks for band metrics.
- Chart power ladder rendering and hit targets consume the option shape returned by `massOptions()`, so option-object compatibility is part of the calculation contract.
- Dry-mass state and selected utility modules already live in `dryMassCalcState` in `tools/drive_comparison_client/state/core.js`.
- Dry-mass normalization, export, import, and mass totals live in `tools/drive_comparison_client/calc/dry_mass_model.js`.
- Dry-mass UI lives in `tools/drive_comparison_client/ui/dry_mass_calculator.js`.
- Chart and design preset persistence lives in `tools/drive_comparison_client/presets/repository.js` and `tools/drive_comparison_client/presets/library.js`.
- Bare JSON import detection is whitelist-based, so new preset fields must be explicitly included if users can paste raw JSON payloads.
- Existing import graph validation passes with no circular imports, but there are known boundary warnings. New module-effect work should not add circular imports or broaden these warnings.

## Refactor Strategy

Use a layered design that keeps module effects out of rendering code:

1. Raw catalog data from `build_ship_catalog.py`.
2. Explicit normalized module-effect descriptors.
3. Pure effect evaluator that turns selected modules plus a drive row into effective drive values and warnings.
4. Calculation integration in `massOptions()` and metric definitions.
5. UI that shows selected assumptions, active modifiers, and unsupported effects.
6. Preset/export/import persistence for module-effect assumptions.
7. Follow-up evaluators for power demand, waste heat, radiator mass, compatibility, and advanced workflows.

The key rule is that rendering modules consume already-computed summaries. They should not decide how module rules work.

## Cross-Phase Invariants

- With module effects disabled or no relevant modules selected, chart rows, table values, tooltips, exports, imports, and presets remain behaviorally unchanged.
- Unknown module rules are never silently applied.
- Every supported module effect has a deterministic test or browser fixture.
- Every phase keeps `npm run verify` passing after its own rebuild.
- Every source client change is followed by UI-only rebuild when template data is not being regenerated:

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
```

- If a phase changes source catalog generation, rebuild the source catalog and generated app assets from template data when available; otherwise keep the phase limited to source-only work.

## Phase Index

1. [Phase 01 - Effect Data Contract](./01-effect-data-contract.md)
2. [Phase 02 - Pure Effect Evaluator](./02-pure-effect-evaluator.md)
3. [Phase 03 - State and Preset Plumbing](./03-state-and-preset-plumbing.md)
4. [Phase 04 - MVP Thrust and EV Calculation](./04-mvp-thrust-ev-calculation.md)
5. [Phase 05 - MVP UX and Warnings](./05-mvp-ux-and-warnings.md)
6. [Phase 06 - MVP Verification Hardening](./06-mvp-verification-hardening.md)
7. [Phase 07 - Power Demand Follow-Up](./07-power-demand-follow-up.md)
8. [Phase 08 - Waste Heat and Radiator Follow-Up](./08-waste-heat-radiator-follow-up.md)
9. [Phase 09 - Compatibility Validation Follow-Up](./09-compatibility-validation-follow-up.md)
10. [Phase 10 - Ship Design Import and Advanced Workflows](./10-ship-design-import-and-advanced-workflows.md)

Post-implementation audit:

- [Issue 6 Post-Implementation Audit and Follow-Up Plan](./11-post-implementation-audit-and-follow-up.md)

## MVP Definition

The MVP is complete after phases 01 through 06:

- Existing module mass handling remains compatible with the dry-mass calculator.
- At least `ThrustMultiplier` and `EVMultiplier` can be represented and evaluated.
- Thrust modifiers affect modified thrust, acceleration, and TWR.
- EV/Isp modifiers affect mass ratio, propellant mass, total mass, and maximum practical dV.
- Active modifiers and unsupported selected effects are visible.
- Export/import and named presets preserve the relevant module-effect assumptions.
- No-module and disabled-effect scenarios match current behavior.
- Deterministic and browser validations cover the new paths.

## Follow-Up Scope Bank

The later phases intentionally keep these out of the MVP unless the MVP implementation proves smaller than expected:

- Add module power draw and power demand modifiers.
- Add waste heat modifiers and radiator mass changes.
- Add drive/reactor/module compatibility checks.
- Add prerequisite and mutual exclusivity validation.
- Add warnings for impossible or unsupported combinations.
- Add save-imported ship module presets once browser-native save parsing exists.
- Add preset templates for common module-effect assumptions.
- Add advanced comparison affordances such as base-vs-modified overlays.
- Add optional optimization helpers only after deterministic effect evaluation is stable.

## Repository Safety Notes

- This planning step adds documentation only under `docs/plan/issue-6/`.
- Future implementation phases should avoid editing generated `docs/assets/js/` directly. Edit `tools/drive_comparison_client/`, rebuild, and review generated diffs.
- Existing generated data should be treated as reproducible output unless a phase explicitly changes catalog generation.
