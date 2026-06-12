# Phase 05 - Drive Link Rendering

## Goal

Render chart progression lines from generated `DATA.driveLinks` instead of connecting every visible drive in the same family.

## Scope

- Replace family-wide line path construction in chart rendering with link-segment rendering based on `DATA.driveLinks`.
- Keep family grouping for colors, filters, legend entries, and row ordering.
- Apply link rendering consistently across basic metrics, total/fuel mass bands, and best-available power views.
- Preserve power ladder lines, power best lines, and hit targets.
- Add browser validation that family-only line connections are no longer rendered.

## Non-Goals

- Do not change the `driveLinks` generation algorithm from Phase 04 except for small fixes discovered during renderer integration.
- Do not redesign the chart legend beyond any necessary line-semantics wording.
- Do not change point visual encoding or pin overlay behavior.
- Do not add user controls for toggling research links unless requested separately.

## Affected Files

- `tools/drive_comparison_client/chart/rendering.js`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/drive_comparison_styles.css`
- `tools/verify_drive_comparison_browser.mjs`
- Potential verifier updates from Phase 04
- Generated `docs/index.html` and `docs/assets/js/**` after rebuild

## Implementation Steps

1. Build a visible-row lookup inside rendering paths, keyed by row ID.
2. Add a helper that resolves `DATA.driveLinks` into drawable link segments for the current visible rows.
3. For basic metrics, draw one segment per resolved link using source/target `rowUnlockResearchValue()` and metric values.
4. For band metrics, resolve source and target to their base chart mass options and draw one segment per generated link.
5. For Best Available mode, resolve source and target to their first compatible power point.
6. Keep segment color tied to the family color or band color already used for points.
7. Skip any link whose source or target row is filtered out, lacks a finite coordinate, or lacks a compatible power option in the current mode.
8. Use a compatibility fallback only when `DATA.driveLinks` is missing or not an array, so older embedded data still renders during transition. The current generated data should use links.
   - Important: an empty `DATA.driveLinks` array is valid data and must not trigger family-line fallback.
   - In code, prefer an explicit `Array.isArray(DATA.driveLinks)` check instead of a truthiness or length check.
9. Update legend copy to clarify that lines represent research progression links, while colors and filters represent families.
10. Add browser checks that:
    - Base drive lines exist when link data exists.
    - Rendered line count is derived from visible `driveLinks`, not family row count.
    - A family with multiple visible drives and no `driveLinks` does not render a connecting family line.
11. Rebuild generated app assets.

## Acceptance Criteria

- Lines are drawn only for generated research dependency links.
- Drives in the same family but without a generated research dependency are not connected by a line.
- Family colors, family show/hide controls, and category controls remain unchanged.
- Fusion progression lines remain visible where generated links exist.
- Fission, electromagnetic, and other non-linear families no longer imply false progression from family membership alone.
- Existing hover, tooltip, zoom, pan, power ladder, and best-available behavior continue to work.
- Browser verification covers link-based rendering.
- An empty `DATA.driveLinks` array suppresses family-line fallback rather than reconnecting drives by family membership.

## Validation Commands

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

If data contract fixes are made in the same phase:

```powershell
npm run build
npm run verify
```

## Manual Smoke Tests

- Open the chart on basic thrust or efficiency metrics and confirm family colors remain consistent.
- Inspect a known fusion family and confirm progression lines remain where research dependencies exist.
- Inspect fission and electromagnetic categories and confirm drives are not connected solely because they share a family.
- Toggle family and category visibility and confirm link segments appear or disappear with their endpoint rows.
- Switch to total mass, fuel mass, TWR, All Ladders, and Best Available views and confirm line segments do not break power paths or hit targets.
- Hover and click points near link segments to confirm tooltips still target points, not lines.

## Rollback Risks

- If the renderer falls back to family paths too broadly, #24 remains unfixed despite generated links.
- Treating an empty `driveLinks` array as absent data would reintroduce misleading family-only lines.
- If link segments are drawn before point groups with high opacity, they can visually compete with point markers.
- Power-view coordinate selection can be confusing if base, all-ladder, and best-available modes do not use consistent endpoint rules.
- Old generated pages without `driveLinks` need a compatibility path during transition.

## Progress

- [ ] Add visible link-segment resolver.
- [ ] Replace family-wide base line rendering.
- [ ] Preserve family grouping for points and filters.
- [ ] Update legend text.
- [ ] Add browser verification.
- [ ] Rebuild generated assets.
- [ ] Run validation commands.
- [ ] Complete manual smoke tests.

## Decision Log

- Decision: Keep family grouping for all non-line semantics.
  Reason: #24 only changes what lines mean; colors and filters remain useful family affordances.
- Decision: Treat an empty `driveLinks` array as authoritative data, not as a fallback trigger.
  Reason: A family can validly have no dependency-backed links; falling back on empty arrays would recreate the misleading family-only progression this issue removes.
- Decision: Draw individual segments instead of one path per family.
  Reason: `driveLinks` is an edge list, and disconnected or branching research paths should not be forced into a single ordered path.
- Decision: Keep links pointer-inert.
  Reason: Existing tooltips are point and ladder based; making links interactive would expand scope.

## Outcomes

Pending implementation.
