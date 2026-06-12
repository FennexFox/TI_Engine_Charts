# Phase 07 - Power Demand Follow-Up

## Goal

Extend module-effect evaluation to power demand once thrust and EV modifiers are stable.

## Scope

- Model selected module effects that alter drive or weapon power assumptions relevant to chart metrics.
- Decide how selected utility module `powerRequirementMW` contributes to power demand assumptions.
- Keep base reactor candidate generation compatible with the current build-time data model.
- Show clear UI labels for base vs modified power demand.

## Non-Goals

- Do not implement waste heat or radiator mass changes in this phase unless directly required by power demand plumbing.
- Do not rebuild power plant candidate lists dynamically from scratch.
- Do not implement full module compatibility validation yet.
- Do not model weapon-specific laser/particle bonuses as drive power modifiers unless the issue owner explicitly scopes them in.

## Affected Files

- `tools/drive_comparison_client/calc/module_effects.js`
- `tools/drive_comparison_client/calc/filtering.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/build_drive_comparison.py` only if build-time option data must expose additional power metadata.
- `tools/verify_module_effects.mjs`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Inventory power-related raw rules:
   - `powerRequirementMW` on utility modules.
   - `LaserPowerBonus`.
   - `ParticleBeamPowerBonus`.
   - any future explicit power modifier descriptors from Phase 01.
2. Decide which effects are in scope for engine-chart power demand.
3. Add effect result fields:
   - `basePowerRequirementGW`.
   - `modifiedPowerRequirementGW`.
   - `moduleAuxiliaryPowerGW`.
   - `powerWarnings`.
4. Update `massOptions()` to use modified power requirement only for selected in-scope effects.
5. Confirm `actualPowerFrontier()` still receives option objects with expected fields.
6. Update power requirement metric and tooltip rows to show base vs modified values.
7. Add tests that prove:
   - no-op behavior is unchanged.
   - selected in-scope power effect changes power plant mass when enabled.
   - unsupported power-like rules warn instead of applying.
8. Update method notes if power semantics become materially different.

## Acceptance Criteria

- No-op behavior remains unchanged.
- Modified power demand can be represented separately from base power demand.
- Any power change that affects reactor mass is deterministic and tested.
- Power ladder rendering still works in `focus`, `all`, and `best` modes.
- Tooltip/table power values do not contradict chart calculations.
- Unsupported weapon-only power rules are clearly ignored or warned.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_axis_ticks.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

If build-time data changes:

```powershell
npm run build:fast
npm run verify
```

## Manual Smoke Tests

- Compare power requirement metric before and after enabling module effects.
- Inspect a power-ladder chart and confirm ladder points remain selectable.
- Toggle power research view between Base, All ladders, and Best Available.
- Select utility modules with auxiliary power draw and confirm warnings/labels explain how that power is handled.
- Confirm a legacy preset still imports with module power effects disabled.

## Rollback Risks

- Current power options are generated at build time; dynamic power changes can invalidate assumptions about the option frontier.
- Adding module auxiliary power to drive power may double-count if later ship-wide power balance is introduced.
- Weapon power bonuses may not belong in drive comparison metrics and can confuse users if presented too early.

## Progress

- [x] Added base/modified power demand fields to module-effect evaluation.
- [x] Applied selected utility `powerRequirementMW` as auxiliary drive power in GW.
- [x] Routed modified power demand through mass options, power metric values, and tooltip rows.
- [x] Added auxiliary-power labels and unsupported power-rule warnings in the module panel and dry-mass selectors.
- [x] Hardened module-effect and browser verification for power demand, power ladders, and legacy preset defaults.
- [x] Rebuilt generated UI assets.
- [x] Validation completed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_axis_ticks.mjs`
  - `node tools/verify_drive_comparison_browser.mjs docs/index.html`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- [x] Manual smoke completed for modified power metrics/mass, auxiliary-power UI labels, power ladder modes, and legacy preset import/default behavior.

## Decision Log

- Decision: Keep power demand after MVP.
  Reason: Issue #6 explicitly lists power demand modifiers as follow-up if the MVP grows large.
- Decision: Preserve base and modified power fields.
  Reason: Tooltips and future heat work need to explain which value drove each result.
- Decision: Treat selected module `powerRequirementMW` as auxiliary power demand, converted from MW to GW.
  Reason: It is a direct positive power draw on the selected utility module and can be represented deterministically without rebuilding reactor candidates.
- Decision: Keep `LaserPowerBonus` and `ParticleBeamPowerBonus` as unsupported power-rule warnings.
  Reason: These weapon-specific bonuses do not map cleanly to drive-chart power demand and are out of scope for this phase.
- Decision: Use modified power demand for power plant mass, waste heat, radiator mass, and the displayed power metric.
  Reason: Those values already derive directly from the option power requirement; preserving separate base values keeps the UI explainable.
- Decision: Preserve the build-time power option frontier.
  Reason: Dynamic reactor candidate generation is a larger compatibility problem and belongs in later scope if needed.

## Outcomes

- Module-effect evaluation now returns `basePowerRequirementGW`, `modifiedPowerRequirementGW`, `moduleAuxiliaryPowerGW`, `powerContributions`, and `powerWarnings`.
- `massOptions()` and the `powerRequirementGW` metric use modified power demand while retaining base values for tooltips and comparison.
- The module-effects panel, dry-mass selector labels, and drive tooltip show auxiliary power contributions and warn for unsupported power-like rules.
- Browser and module-effect verification now cover auxiliary power math, power mass deltas, unsupported power warnings, power ladder modes, and legacy preset compatibility.
- Generated `docs/index.html` and `docs/assets/js/` were regenerated after the source changes.

## Retrospective

- What worked: Keeping base and modified power fields separate made the chart metric, mass options, and tooltip behavior straightforward to verify.
- What to watch: Auxiliary power currently increases drive comparison power demand directly; future ship-wide power balance work should re-evaluate whether this remains the right model.
- Follow-up scope: Phase 08 can layer heat/radiator-specific module rules on top of the power fields added here instead of changing the power-demand contract again.

