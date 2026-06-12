# Phase 02 - Chart Point Visual Encoding

## Goal

Separate low-TWR or otherwise impractical candidate visuals from Pareto and secondary-metric visuals so a point can communicate both states without relying on the same faded/transparency signal.

## Scope

- Refactor point visual calculation in `tools/drive_comparison_client/chart/rendering.js`.
- Keep Pareto-dominated de-emphasis and secondary brightness behavior, but stop using low-TWR/impractical status as another opacity fade.
- Introduce an explicit marker treatment for low-TWR/extreme-mass candidates, such as a warning ring, marker outline, shape accent, or class-driven overlay.
- Update legend/help text in `tools/drive_comparison_client/chart/interaction.js` and related help text if needed.
- Add browser verification that low-TWR/impractical and Pareto-dominated states can coexist visually.

## Non-Goals

- Do not change filtering rules for minimum TWR, minimum dV, mass ratio, or Pareto calculations.
- Do not change pinning/click behavior in this phase.
- Do not add the selection/pin overlay yet.
- Do not change drive line rendering.
- Do not change table or tooltip numerical values.

## Affected Files

- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/drive_comparison_client/calc/filtering.js`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client/state/core.js`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/**` after rebuild

## Implementation Steps

1. Inventory every current point-rendering path:
   - `drawMetricLines()`
   - `drawTotalMassBands()`
   - `drawPowerBestAvailableComparison()`
   - `drawFirstCompatiblePowerPoint()`
   - `drawBestAvailablePowerPath()`
   - `drawPowerLadder()`
2. Extract a small visual helper for band points, for example `bandPointVisualState(option, secondaryDomain, paretoKeys)`, that returns:
   - Pareto state.
   - Secondary encoding style.
   - Impractical or low-TWR state.
   - SVG class names and data attributes.
3. Keep Pareto de-emphasis as the only semantic dimming state, unless secondary brightness is active.
4. Encode low-TWR/extreme-mass candidates using a separate visible treatment, preferably a stroke/ring or marker accent that can coexist with Pareto opacity.
5. Ensure the chosen treatment remains visible on dark backgrounds and with family colors.
6. Add data attributes such as `data-pareto-dominated` and `data-impractical` to support browser verification and future debugging.
7. Update the chart legend:
   - Pareto-dominated candidates are dimmed.
   - Low-TWR or impractical candidates use the chosen marker treatment.
   - Secondary brightness remains described only when enabled.
8. Add browser checks that, with impractical candidates shown and Pareto highlight enabled, at least one candidate can have both `data-impractical="true"` and `data-pareto-dominated="true"` without losing its low-TWR marker.
9. Rebuild generated app assets.

## Minimum Pre-Release Cut

If the full point-visual helper refactor grows too large, keep this phase shippable by limiting the implementation to:

- Semantic data attributes for Pareto-dominated and impractical/low-TWR points.
- One explicit marker treatment for impractical/low-TWR points, preferably a stroke/ring that can coexist with Pareto opacity.
- Updated legend/help wording that names the two different visual meanings.
- A browser check that proves a combined Pareto + impractical point still exposes the impractical marker.

Deeper cleanup of duplicated point-rendering code can move to a later refactor as long as the public ambiguity is removed.

## Acceptance Criteria

- Low-TWR or impractical status no longer depends on the same opacity fade used for Pareto dominance.
- Pareto-dominated status remains visually distinct from low-TWR/impractical status.
- A point can visually show both Pareto-dominated and low-TWR/impractical state.
- Hover, tooltip, legend, and table behavior remain unchanged.
- Existing point hit targets still work for base points, power ladder points, and best-available points.
- Browser verification covers the new visual semantics.

## Validation Commands

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

## Manual Smoke Tests

- Enable a band metric such as total mass.
- Enable Pareto highlighting.
- Enable impractical candidates and raise the minimum TWR threshold until low-TWR candidates are visible.
- Confirm Pareto-dominated candidates are dimmed.
- Confirm low-TWR/impractical candidates use a different marker treatment.
- Hover low-TWR, Pareto, and combined-state points and confirm tooltips still appear.
- Switch to Best Available and All Ladders power views and confirm extra points retain sensible visuals.

## Rollback Risks

- A marker treatment that relies only on color may be hard to see against some family colors.
- SVG stroke changes can accidentally affect hover stroke if the existing `pointAttrs()` contract is not updated carefully.
- Legend copy can become inaccurate if the point helper and text are not kept together.
- Tests that assert exact opacity or stroke values may become brittle across browsers.

## Progress

- [ ] Refactor point visual state helper.
- [ ] Add low-TWR/impractical marker treatment.
- [ ] Update legend/help text.
- [ ] Add browser checks.
- [ ] Rebuild generated assets.
- [ ] Run validation commands.
- [ ] Complete manual smoke tests.

## Decision Log

- Decision: Leave interaction and pinning behavior untouched in this phase.
  Reason: Visual semantics can be reviewed independently from click behavior.
- Decision: Keep Pareto as the only semantic dimming state.
  Reason: #23 specifically calls out overlapping faded meanings as the ambiguity to remove.
- Decision: Add data attributes for visual states.
  Reason: Browser verification should inspect semantic state instead of fragile SVG paint details alone.

## Outcomes

Pending implementation.
