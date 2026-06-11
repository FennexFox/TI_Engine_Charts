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

- [ ] Not started.

## Decision Log

- Decision: Depend on Phase 07 before changing waste heat.
  Reason: Waste heat is derived from power demand and reactor efficiency in the current model.
- Decision: Keep radiator formula centralized in `massOptions()`.
  Reason: Chart, table, and tooltip all consume this option shape.

## Outcomes

- Pending.
