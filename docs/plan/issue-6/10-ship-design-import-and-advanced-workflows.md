# Phase 10 - Ship Design Import and Advanced Workflows

## Goal

Use the stabilized module-effect model to support richer workflows such as imported ship module presets, base-vs-modified comparisons, reusable effect presets, and future optimization helpers.

## Scope

- Add save-imported ship module presets when browser-native save parsing exists.
- Add base-vs-modified comparison affordances.
- Add built-in module-effect assumption presets if useful.
- Add advanced warning summaries for impossible or unsupported combinations.
- Prepare future optimization helpers without implementing automatic optimization prematurely.

## Non-Goals

- Do not add server-side calculation.
- Do not promise full Terra Invicta ship designer parity.
- Do not parse game save files until there is a separate import foundation.
- Do not automatically choose best modules for users in this phase.

## Affected Files

- `tools/drive_comparison_client/presets/repository.js`
- `tools/drive_comparison_client/presets/library.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `data/preset_library.json`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Define imported ship-design payload shape once a save parser or browser-native import source exists.
2. Map imported ship modules into dry-mass calculator selections.
3. Preserve imported module-effect assumptions in dry-mass and chart preset exports.
4. Add optional base-vs-modified UI:
   - tooltip delta rows.
   - table delta badges.
   - chart overlay only if it stays readable.
5. Add reusable assumption presets:
   - no modifiers.
   - selected dry-mass modules.
   - common spiker/tankage assumptions.
6. Add richer warning summaries:
   - unsupported selected modules.
   - incompatible modules.
   - ignored effects.
   - missing data.
7. Add browser tests for imported preset mapping and base-vs-modified display.
8. Document remaining limits in user-facing notes.

## Acceptance Criteria

- Imported module assumptions map into existing calculator state without breaking manual editing.
- Export/import preserves imported assumptions.
- Base-vs-modified display is clear and does not overwhelm the chart.
- Built-in effect presets, if added, are optional and do not change defaults.
- Warnings remain explicit for unsupported combinations.
- Existing manual dry-mass and chart preset workflows remain working.

## Validation Commands

```powershell
node tools/verify_drive_comparison_browser.mjs docs/index.html
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

If built-in preset data changes:

```powershell
npm run build:fast
npm run verify
```

## Manual Smoke Tests

- Import a representative ship/module assumption payload.
- Confirm dry-mass calculator selections match the imported payload.
- Apply dry mass and defaults, then enable module effects.
- Compare base and modified values in tooltip/table.
- Save as a named preset, refresh, and reapply.
- Export and import the same scenario on a clean localStorage profile.

## Rollback Risks

- Base-vs-modified overlays can clutter the chart and hurt scanning.
- Imported ship payload assumptions may not match current catalog IDs after game updates.
- Built-in assumption presets can create maintenance burden if module rules change.
- Optimization helpers can imply more precision than the app supports.

## Progress

- [x] Added explicit browser-native ship assumption import payload support.
- [x] Mapped imported dry-mass calculator selections and module-effect assumptions into existing app state.
- [x] Added compact base-vs-modified badges for non-band table metrics affected by module effects.
- [x] Extended browser verification for ship assumption import, named preset reapply, clean-profile export/import, and table delta display.
- [x] Regenerated UI-only docs output and completed verification.

## Decision Log

- Decision: Defer imported ship designs until the module-effect model is stable.
  Reason: Import workflows should not hard-code transitional calculation assumptions.
- Decision: Keep automatic optimization out of scope.
  Reason: Issue #6 explicitly excludes automatic module choice optimization for the first pass.
- Decision: Define the phase-10 import boundary as `ti-engine-chart-ship-assumption/v1`, not as a Terra Invicta save-file parser.
  Reason: The app can safely import explicit browser-native assumptions now, while game save parsing still needs a separate schema and compatibility foundation.
- Decision: Keep base-vs-modified comparison in table badges and existing tooltip detail instead of adding a chart overlay.
  Reason: The chart is already dense; a compact table affordance provides discoverability without adding visual clutter.
- Decision: Do not add built-in module-effect assumption presets in this phase.
  Reason: Current dry-mass selection plus named chart/design presets already cover reusable assumptions, and built-in presets would add catalog-maintenance burden without changing defaults.
- Decision: Treat Phase 09 warning diagnostics as the advanced warning summary baseline for this phase.
  Reason: Unsupported, incompatible, ignored, and missing-data states are already explicit in the module-effect panel and tooltip diagnostics.

## Outcomes

- `tools/drive_comparison_client/presets/library.js` now accepts `ti-engine-chart-ship-assumption/v1` payloads with a dry-mass calculator object and optional `moduleEffects` block.
- Importing that payload applies calculator slots, notes, simulation defaults, and module-effect source/enabled/manual-ID assumptions without parsing game saves.
- Exported chart presets continue to preserve dry-mass calculator and module-effect assumptions, so imported ship scenarios can be saved, reloaded, and re-imported on a clean profile.
- `tools/drive_comparison_client/ui/tooltip_table.js` now shows a small base-value badge on thrust, fuel-efficiency, or power-requirement table cells when module effects change the displayed value.
- The right-panel Performance Detail now highlights modified total performance values and exposes baseline performance plus module-impact breakdowns through hover text.
- Module-effect warnings now suppress unmodeled rules outside the chart's drive performance and research-cost scope while retaining power-demand and heat/radiator warnings.
- Browser verification covers representative ship assumption import, dry-mass mapping, module-effect mapping, base-vs-modified table display, named preset reapply, and clean-profile export/import.
- Validation completed:
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `node tools/verify_drive_comparison_browser.mjs docs/index.html`
  - `npm run verify`
  - In-app Browser smoke confirmed generated `docs/index.html` loads with chart points, table rows, dry-mass entry point, and no runtime errors.

## Retrospective

- What worked: The explicit assumption-payload boundary kept import behavior useful without prematurely committing to a game save parser.
- What worked: Keeping base-vs-modified comparison in table badges and Performance Detail preserved the existing chart surface while making module effects discoverable.
- What changed after initial implementation: Performance Detail needed a stronger distinction between baseline drive performance and total module-adjusted performance, because simply showing `base` inline could make users wonder whether module effects were only partially applied.
- What to watch: Import diagnostics are still coarse; a later pass should report modules that were dropped or normalized during calculator import.
- Follow-up scope: Document the `ti-engine-chart-ship-assumption/v1` schema, add dropped-module reporting, and validate modified power demand against reactor capacity assumptions before expanding real ship-design import.

