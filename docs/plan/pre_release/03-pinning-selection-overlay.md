# Phase 03 - Pinning and Selection Overlay

## Goal

Render hover, selection, and pinned outlines as a separate overlay that remains visible regardless of point opacity, then make clicking an already pinned point unpin it.

## Scope

- Add a chart overlay layer for selected, pinned, and hover/focus outlines in `tools/drive_comparison_client/chart/rendering.js`.
- Update chart click behavior in `tools/drive_comparison_client/chart/interaction.js` to toggle pinned state for already pinned point hits.
- Add any small public pin-state helper needed in `tools/drive_comparison_client/ui/tooltip_table.js`.
- Preserve existing tooltip card pin buttons and keyboard shortcuts.
- Add browser tests for visible overlay and click-to-unpin.

## Non-Goals

- Do not change low-TWR or Pareto visual encoding from Phase 02.
- Do not change tooltip table layout beyond what is necessary for pin state synchronization.
- Do not change chart pan, zoom, hover, or ladder hit-test tolerances except as needed for correctness.
- Do not change drive line rendering.

## Affected Files

- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_styles.css`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/**` after rebuild

## Implementation Steps

1. Identify the stable source of point coordinates after render. Prefer reusing `chartHitTargets` because every interactive point already registers there.
2. Add a function that draws an overlay group after all point groups are rendered. The overlay should use `pointer-events: none`.
3. Draw pinned outlines from `state.pinnedTooltipItems` resolved to current chart hit targets.
4. Draw hover/focus outlines from `state.hoverPoints` where they are not already represented by pinned outlines.
5. Use overlay classes such as `point-state-overlay`, `is-pinned`, and `is-hovered` rather than mutating data point opacity.
6. Update `updateHoverStyles()` so hover remains compatible with the overlay and does not hide default marker treatment from Phase 02.
7. Add a chart-level pin toggle helper:
   - If the primary clicked point is already pinned, remove that pinned item.
   - If the primary clicked point is not pinned, pin it using existing behavior.
   - For multi-hit clicks, keep behavior deterministic by using the nearest hit first.
8. Keep `Escape`, `p`/Space keyboard behavior, tooltip pin buttons, and clear-tooltip behavior compatible with existing semantics.
9. Add browser checks:
   - Pin a faded or Pareto-dominated point and assert a separate overlay exists.
   - Click the same point again and assert it unpins.
   - Confirm changing thruster count still resolves pinned card identity as existing tests expect.
10. Rebuild generated app assets.

## Minimum Pre-Release Cut

If the full overlay treatment grows too large, prioritize the user-visible friction points first:

- Pinned/selected points must receive an opacity-independent overlay or outline.
- Clicking the nearest already pinned point must unpin it.
- Tooltip card pin buttons must remain synchronized with the chart state.

Hover-specific overlay polish can remain lighter as long as existing hover feedback and tooltip targeting do not regress.

## Acceptance Criteria

- Selection and pin outlines are rendered in an overlay independent of data point opacity.
- Selected/pinned outlines remain visible for Pareto-dominated or visually de-emphasized points.
- Clicking a point pins/selects it.
- Clicking the same pinned point again unpins it.
- Tooltip card pin buttons still toggle pin state.
- Existing hover, tooltip, pan, zoom, and keyboard behavior continue to work.
- Browser verification covers click-to-unpin and overlay existence.

## Validation Commands

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

## Manual Smoke Tests

- Hover a normal point and confirm tooltip and hover outline appear.
- Click a normal point and confirm it pins.
- Click the same point again and confirm it unpins.
- Pin a Pareto-dominated or low-TWR/impractical point and confirm the outline is still prominent.
- Use the tooltip card pin button and confirm it stays synchronized with the chart overlay.
- Pan and zoom the chart, then verify pinned outlines redraw at the correct coordinates.
- Press Escape and `p`/Space in the existing tooltip flows and confirm behavior remains coherent.

## Rollback Risks

- Overlay drawing from hit targets can miss non-interactive points if any render path forgets to register a target.
- Multi-hit clicks may surprise users if all nearby points toggle instead of only the nearest one.
- If overlay state is drawn before all points, it can still be obscured by later data markers.
- Updating hover styling and overlay drawing in different places can cause duplicate or inconsistent outlines.

## Progress

- [x] Add overlay rendering.
- [x] Add chart-level click-to-unpin.
- [x] Preserve tooltip card pin behavior.
- [x] Add browser verification.
- [x] Rebuild generated assets.
- [x] Run validation commands.
- [x] Complete manual smoke tests.

## Decision Log

- Decision: Use a separate SVG overlay group for pin/selection state.
  Reason: This directly addresses #23 by making outlines independent of point opacity.
- Decision: Toggle only the nearest clicked point when unpinning from the chart.
  Reason: Multi-hit pin toggling should be predictable and should not unexpectedly remove several cards.
- Decision: Keep tooltip card pin buttons as the canonical per-card controls.
  Reason: They already support explicit per-card toggling and should not be replaced by chart-only behavior.
- Decision: Treat `tooltipPinned` plus current tooltip cards as chart-pinned state for overlay rendering.
  Reason: Chart clicks previously pinned the current card set without adding per-card pins, so the overlay needs to reflect that existing chart-level behavior.
- Decision: Give explicit card pins and chart-pinned selections the same pinned overlay priority.
  Reason: Both states should remain visible independently of point opacity and should not be hidden behind hover styling.
- Decision: Keep overlay rings out of hit testing with `pointer-events: none`.
  Reason: Overlay rendering must not affect existing hover, click, pan, or zoom hit targets.

## Outcomes

Implemented. Chart point state is now drawn in a separate `point-state-overlay` SVG group after data points and warning rings. The overlay uses current `chartHitTargets` coordinates and renders pinned, hovered, and selected rings without mutating point opacity.

Click behavior now toggles the nearest hit deterministically. Clicking a normal point pins the chart selection. Clicking the same chart-pinned point unpins it. If a tooltip card pin is active for the clicked point, the chart click removes that explicit pin through the shared tooltip helper so card buttons and overlay state stay synchronized.

Updated source files:

- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_styles.css`
- `tools/verify_drive_comparison_browser.mjs`

Regenerated output:

- `docs/index.html`
- `docs/assets/js/chart/rendering.js`
- `docs/assets/js/chart/interaction.js`
- `docs/assets/js/ui/tooltip_table.js`

Validation results:

- `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push` passed.
- `node tools/verify_drive_comparison_client_syntax.mjs` passed.
- `node tools/verify_drive_comparison_import_graph.mjs` passed with 0 circular dependency groups and the existing 6 boundary warnings available via `--show-boundary-warnings`.
- `node tools/verify_drive_comparison_browser.mjs` passed.
- `npm run verify` passed.

Manual smoke results:

- Hovered a normal point and confirmed tooltip cards plus hover overlay appeared.
- Clicked a normal point and confirmed chart-pinned state plus pinned overlay.
- Clicked the same point again and confirmed chart-pinned state and pinned overlay cleared.
- Used a tooltip card pin button and confirmed explicit pin state, `aria-pressed`, and overlay stayed synchronized.
- Clicked the same card-pinned point on the chart and confirmed the explicit card pin cleared.
- Pinned a combined impractical plus Pareto-dominated point and confirmed the overlay stayed more prominent than the dimmed point.
- Zoomed and panned with a pinned point and confirmed pinned overlay coordinates redrew.
- Pressed `p`, `Escape`, and `Space` in tooltip flows and confirmed pinned overlay behavior remained coherent.

## Retrospective

The existing system had two pin concepts: chart-level pinned tooltip state and explicit per-card pins. Phase 03 keeps both concepts intact but renders them with the same overlay priority, which avoids changing tooltip semantics while solving the visibility and click-to-unpin friction.
