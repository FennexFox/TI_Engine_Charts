# Phase 08 - Waste Heat and Radiator Follow-Up

## Goal

Model waste heat and radiator mass changes caused by module effects after power demand semantics are stable.

## Scope

- Add waste-heat modifiers to the pure evaluator.
- Feed modified waste heat into radiator mass calculation.
- Preserve open-cycle and self-contained drive behavior.
- Update tooltips and method notes.
- Add warnings when selected modules imply heat effects the app cannot model.

## Non-Goals

- Do not implement complete thermal ship-designer parity.
- Do not change radiator catalog generation unless required.
- Do not add radiator compatibility validation beyond current radiator selection.
- Do not tune UI layout beyond showing the new information clearly.

## Affected Files

- `tools/drive_comparison_client/calc/module_effects.js`
- `tools/drive_comparison_client/calc/filtering.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_template.html`
- `tools/drive_comparison_i18n.py`
- `tools/build_drive_comparison.py` if method notes or embedded metadata need updates.
- `tools/verify_module_effects.mjs`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Add evaluator output fields:
   - `baseWasteHeatGW`.
   - `modifiedWasteHeatGW`.
   - `wasteHeatMultiplier`.
   - `heatWarnings`.
2. In `massOptions()`, compute radiator mass from modified waste heat only when heat effects are enabled and supported.
3. Preserve:
   - zero radiator mass for self-contained drives.
   - zero waste heat for open-cycle cooling drives.
   - current radiator-specific-power formula.
4. Update tooltip mass breakdown to show whether radiator mass is base or modified.
5. Add chart/table tests for a selected heat modifier that changes radiator mass.
6. Add warnings for selected modules with heat-like raw rules that remain unsupported.
7. Update calculation note and method metadata to mention module heat assumptions.

## Acceptance Criteria

- No-op radiator mass behavior remains unchanged.
- Supported waste-heat modifiers affect radiator mass deterministically.
- Open-cycle and self-contained drive exceptions remain intact.
- Tooltip breakdown shows modified radiator mass and heat source.
- Unsupported heat effects produce visible warnings.
- Preset round trips preserve heat-effect enabled state and selected assumptions.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

If build metadata changes:

```powershell
npm run build:fast
npm run verify
```

## Manual Smoke Tests

- Select a radiator with known specific power and inspect mass breakdown.
- Enable a supported heat effect and confirm radiator mass changes.
- Switch to an open-cycle drive and confirm heat/radiator behavior is still zero where expected.
- Switch radiators and confirm modified heat still feeds the selected radiator formula.
- Export/import the scenario and confirm values return.

## Rollback Risks

- Heat changes can amplify total mass and make chart values look broken if labels are unclear.
- Open-cycle and self-contained exceptions are easy to regress.
- Future power-demand changes and heat changes can conflict if both own the same `powerRequirementGW` assumptions.

## Progress

- [x] Confirmed current generated utility-module data has no explicit heat/radiator special rule beyond Phase 07 auxiliary power draw.
- [x] Added normalized `WasteHeatMultiplier` contract support in catalog generation for future data compatibility.
- [x] Added evaluator output for `wasteHeatMultiplier`, heat warnings, and base/modified heat placeholders.
- [x] Updated `massOptions()` to compute base and modified waste heat/radiator mass with self-contained and open-cycle exceptions preserved.
- [x] Updated tooltip and module-effect UI summaries to show waste-heat modifiers, modified waste heat, base values, and heat warnings.
- [x] Updated calculation note and generated method metadata for module heat assumptions.
- [x] Added deterministic and browser fixture coverage for supported heat multipliers and unsupported heat-like rules.
- [x] Rebuilt generated UI assets.
- [x] Validation completed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_drive_comparison_browser.mjs docs/index.html`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
  - Conditional metadata validation: `npm run build:fast`
- [x] Manual smoke completed for radiator switching, supported heat modifier radiator changes, open-cycle/self-contained zero-heat exceptions, and export/import restoration.

## Decision Log

- Decision: Depend on Phase 07 before changing waste heat.
  Reason: Waste heat is derived from power demand and reactor efficiency in the current model.
- Decision: Keep radiator formula centralized in `massOptions()`.
  Reason: Chart, table, and tooltip all consume this option shape.
- Decision: Add `WasteHeatMultiplier` as a normalized effect contract even though current generated data does not contain that rule.
  Reason: Phase 08 needs a stable evaluator/mass-option contract for heat effects, and fixture coverage can prove the path without inventing production data.
- Decision: Treat selected module auxiliary power as increasing modified waste heat through the existing power-demand formula.
  Reason: Phase 07 already changed modified drive power; radiator mass should derive from the same modified power input.
- Decision: Preserve self-contained and open-cycle behavior after heat multipliers.
  Reason: Those exceptions are part of the existing drive/power option semantics and should override module heat changes.
- Decision: Keep unsupported heat-like rules visible through `heatWarnings` instead of applying them.
  Reason: No current catalog rule maps to a validated heat formula, and unknown thermal semantics should not silently affect chart values.

## Outcomes

- Module-effect evaluation now tracks `wasteHeatMultiplier` and `heatWarnings`.
- Runtime mass options now expose `baseWasteHeatGW`, `modifiedWasteHeatGW`, `baseRadiatorMassTons`, and `wasteHeatMultiplier` while preserving `wasteHeatGW`/`radiatorMassTons` as the modified values consumed by existing chart code.
- Tooltip mass breakdown now shows modified radiator mass and waste heat with base values when they differ.
- The calculation note and method metadata now describe supported module drive, auxiliary-power, and heat effects.
- Verifiers cover supported heat multiplier behavior, unsupported heat warnings, radiator switching, open-cycle/self-contained exceptions, and export/import restoration.

## Retrospective

- What worked: Adding the heat contract at the evaluator boundary kept rendering changes small and left radiator math centralized.
- What to watch: The production catalog currently lacks heat-specific module rules, so this phase relies on verifier fixtures for supported heat multiplier coverage.
- Follow-up scope: If future data adds multiple heat-effect operations, extend the normalized effect schema before adding more ad hoc runtime branches.
