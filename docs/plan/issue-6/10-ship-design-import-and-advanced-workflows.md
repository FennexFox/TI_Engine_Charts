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

- [ ] Not started.

## Decision Log

- Decision: Defer imported ship designs until the module-effect model is stable.
  Reason: Import workflows should not hard-code transitional calculation assumptions.
- Decision: Keep automatic optimization out of scope.
  Reason: Issue #6 explicitly excludes automatic module choice optimization for the first pass.

## Outcomes

- Pending.

