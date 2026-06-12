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

- [x] Added the module effects enable/disable panel near dry-mass assumptions.
- [x] Added source, selection count, active-effect chips, muted non-effect chips, and warnings.
- [x] Marked dry-mass utility-module options and selected slots with effect summaries.
- [x] Added tooltip module-effect detail with active modifiers, unmet prerequisites, unsupported rules/effects, and MVP power-side limitation notes.
- [x] Added responsive chip/warning styles for the sidebar, dry-mass modal, and tooltips.
- [x] Extended browser verification for visible warnings, localization, dry-mass labels, tooltip diagnostics, and mobile overflow.
- [x] Rebuilt generated UI assets under `docs/index.html` and `docs/assets/js/`.
- [x] Validation passed:
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `node tools/verify_drive_comparison_browser.mjs`
  - `npm run verify`
- [x] Manual smoke passed by Playwright session for English/Korean language switching, dry-mass module chips, compatible tooltip effects, incompatible warnings, unsupported-rule warnings, and mobile no-overflow.

## Decision Log

- Decision: Show MVP limitation warnings in UI.
  Reason: Users must not mistake modified thrust/EV for full ship-designer parity.
- Decision: Keep effect summaries compact.
  Reason: The dry-mass calculator already has dense controls.
- Decision: Use `currentChartRows` for tooltip UX test fixtures.
  Reason: Tooltip cards resolve through the current rendered row set, so tests must target visible rows instead of arbitrary catalog rows.
- Decision: Keep phase-specific localization in the existing `localText` pattern rather than adding a new i18n table entry.
  Reason: The nearby control and tooltip code already uses inline localized strings, and this keeps the change scoped.
- Decision: Make the static Playwright server avoid Chromium unsafe ports.
  Reason: The rebuild command runs browser verification, and an ephemeral assignment of port `1720` caused a non-deterministic `ERR_UNSAFE_PORT` failure.

## Outcomes

- Users can now toggle MVP module performance effects from the main controls and see the active source, selected module count, effect count, and warnings.
- Dry-mass calculator module selections now surface known thrust and EV/Isp modifiers directly in options and selected slot chips.
- Tooltips now show active module effects and base-vs-modified thrust/EV values, plus unmet prerequisite and unsupported-rule diagnostics.
- Unsupported-only selections are no longer silent; they render explicit warnings.
- Mobile and narrow-panel layouts wrap effect chips and warning rows without horizontal overflow.
- Generated docs were refreshed and all planned validation passed.

## Retrospective

- The main implementation stayed within the planned MVP boundary: thrust and EV/Isp are surfaced, while power demand, waste heat, and radiator mass remain base values with explicit warnings.
- The only extra scope was stabilizing `tools/static_http_server.mjs` against Chromium unsafe ephemeral ports, which was necessary for the required rebuild validation to pass reliably.

