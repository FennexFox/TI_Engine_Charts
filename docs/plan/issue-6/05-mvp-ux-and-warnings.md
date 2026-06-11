# Phase 05 - MVP UX and Warnings

## Goal

Expose module-effect assumptions and diagnostics in the UI so users can see when module modifiers are active, inactive, unsupported, or limited by current MVP scope.

## Scope

- Add controls near dry mass / ship assumptions.
- Add visible summaries for active performance modifiers.
- Add warnings for unsupported or unevaluated effects.
- Show active modifiers in drive tooltip or detail surfaces.
- Keep base-vs-modified distinction clear where practical.

## Non-Goals

- Do not add advanced chart overlays yet.
- Do not implement full compatibility validation yet.
- Do not implement power or waste-heat modifiers yet.
- Do not redesign the dry-mass calculator layout beyond the needed controls and summaries.

## Affected Files

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_i18n.py`
- `tools/drive_comparison_client/ui/controls.js`
- `tools/drive_comparison_client/ui/control_state.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Add a compact module effects control near simulation or dry-mass assumptions.
2. Include:
   - enable/disable toggle.
   - selected module source label.
   - count or list of active modifier modules.
   - warning area.
3. In the dry-mass modal, mark utility modules with known performance effects.
4. Add effect summary rows or chips:
   - thrust multiplier.
   - EV/Isp multiplier.
   - unmet prerequisite.
   - unsupported effect.
5. In tooltip metrics, show base and modified values where useful:
   - thrust.
   - EV/Isp.
   - TWR or total mass if affected.
6. Add a clear note when power demand and waste heat are still base/unmodified in the MVP.
7. Ensure localized English/Korean labels are added through existing i18n flow.
8. Add responsive styles that avoid overflow with long module names.
9. Extend browser tests for UI visibility and warnings.

## Acceptance Criteria

- Users can see whether module effects are enabled.
- Users can see which selected modules produce active modifiers.
- Unsupported selected module effects produce explicit warning text.
- Unmet prerequisites produce explicit warning text.
- Tooltip or detail panel shows active performance modifiers.
- Base drive performance and modified performance are distinguishable where practical.
- Long module names do not break the dry-mass modal or chart sidebar layout.
- Existing language switching updates new labels.

## Validation Commands

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

Optional responsive checks:

```powershell
node tools/verify_drive_comparison_browser.mjs
```

## Manual Smoke Tests

- Open the app in English and Korean.
- Open dry-mass calculator and select known performance modules.
- Confirm modules with effects are visibly identified.
- Enable module effects and inspect chart tooltip for a compatible drive.
- Select an incompatible module and confirm the warning appears.
- Select a module with only unsupported rules and confirm it is not silently applied.
- Resize to mobile width and confirm controls and warning chips do not overlap.

## Rollback Risks

- UI warnings can become noisy if every unsupported non-engine module emits a high-priority warning.
- Putting effect evaluation in tooltip code would duplicate calculation logic and create drift.
- New controls near dry mass can overcrowd the left panel if not kept compact.

## Progress

- [ ] Not started.

## Decision Log

- Decision: Show MVP limitation warnings in UI.
  Reason: Users must not mistake modified thrust/EV for full ship-designer parity.
- Decision: Keep effect summaries compact.
  Reason: The dry-mass calculator already has dense controls.

## Outcomes

- Pending.

