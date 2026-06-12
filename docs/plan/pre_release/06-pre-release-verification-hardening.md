# Phase 06 - Pre-Release Verification and Legend Hardening

## Goal

Close the pre-release refactor with targeted verification, documentation, legend/interaction-guide hardening, and outcome updates for issues #23, #24, #25, and #26.

## Scope

- Expand or tighten deterministic and browser checks for the completed behavior.
- Implement or update the compact chart legend / interaction guide required for #26.
- Update developer documentation for the new chart visual and drive-link contracts.
- Review generated output discipline and ensure source files own the behavior.
- Record final outcomes in the phase documents.
- Run a full validation pass.

## Non-Goals

- Do not introduce new product behavior in this phase unless a verification finding exposes a small bug in the just-completed phases.
- Do not refactor unrelated modules.
- Do not add new ship-designer features beyond #25 acceptance.
- Do not add new research graph features beyond #24 acceptance.
- Do not build a full tutorial, onboarding flow, or documentation site for #26; keep the guide compact and close to the chart.

## Affected Files

- `tools/verify_drive_comparison_browser.mjs`
- `tools/drive_comparison_client/chart/interaction.js` and related legend/help modules
- `tools/drive_comparison_template.html` and `tools/drive_comparison_styles.css` if the guide needs DOM or styling updates
- Potential new or updated verifier from Phase 04
- `docs/dev/native-esm-architecture.md`
- `README.md` if user-facing rebuild or validation notes need adjustment
- Phase plan files under `docs/plan/pre_release/`
- Generated `docs/index.html` and `docs/assets/js/**` only if source changes require rebuild

## Implementation Steps

1. Review each issue acceptance criterion and map it to an automated or manual validation item.
2. Add browser assertions for:
   - Ship Designer section visibility and dry-mass modal access.
   - Module-effects controls remaining grouped and functional.
   - Low-TWR/impractical visual marker not relying on Pareto opacity.
   - Pin overlay visibility on de-emphasized points.
   - Click-to-unpin on the same point.
   - Link-based drive progression rendering.
   - Legend / interaction guide visibility and copy for color, line, point-state, hover, pinning, and power-ladder semantics.
3. Add or update data-contract assertions for `driveLinks`.
4. Add or update compact user-facing guide content that explains:
   - Family/subfamily colors and filters.
   - Research progression lines.
   - Pareto-dominated dimming.
   - Low-TWR or impractical markers.
   - Hover, selected, and pinned states.
   - Power ladder / Best Available views when enabled.
5. Update `docs/dev/native-esm-architecture.md` with the new ownership rules:
   - Builder owns `driveLinks`.
   - Chart rendering consumes link edges.
   - Point visual state belongs in chart rendering helpers, not calculation modules.
   - Ship Designer DOM owns grouping, while dry-mass model remains calculation state.
   - Legend/guide copy belongs near chart interaction/rendering ownership and should stay synchronized with visual semantics.
6. Run UI-only or full rebuild depending on whether generated data changed.
7. Run `npm run verify`.
8. Run manual smoke tests across desktop and mobile widths.
9. Update each phase plan's Progress and Outcomes sections with what shipped and what validation passed.

## Acceptance Criteria

- Automated validation covers the main behavior for #23, #24, #25, and the compact guide surface for #26.
- Manual smoke tests have a documented checklist and pass.
- Developer documentation explains the new link, point-state, and guide/legend ownership boundaries.
- Generated assets are rebuilt from source where needed.
- `npm run verify` passes.
- Phase Outcomes sections record final implementation and validation results.

## Validation Commands

```powershell
python -m compileall -q tools scripts
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_axis_ticks.mjs
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs
npm run verify
```

If any source or data changes require regenerated published output:

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

If `driveLinks` data changed and local templates are available:

```powershell
npm run build
npm run verify
```

## Manual Smoke Tests

- Desktop viewport:
  - Confirm Ship Designer section is visible in Simulation Conditions.
  - Open and apply dry-mass calculator values.
  - Toggle module performance effects and inspect summary/chips/warnings.
  - Enable Pareto, secondary brightness, and impractical candidates, then verify distinct point state visuals.
  - Pin a de-emphasized point, confirm overlay visibility, click again, and confirm unpin.
  - Inspect fusion and fission/electromagnetic categories for correct research-link line behavior.
- Legend / guide:
  - Confirm the guide explains family colors, research progression lines, Pareto dimming, low-TWR/impractical markers, hover, pinning, and power-ladder semantics.
  - Confirm the guide is discoverable without opening developer documentation or the issue tracker.
- Mobile viewport:
  - Confirm no Ship Designer controls overlap or overflow.
  - Confirm chart legend/guide text wraps cleanly.
  - Confirm tooltip and pin controls remain usable.
- Language:
  - Switch Korean and English and verify new labels and legend text refresh.
- Persistence:
  - Reload after left-panel reorder/collapse and confirm layout still restores.
  - Export/import chart and dry-mass presets and confirm relevant assumptions survive.

## Rollback Risks

- Verification-only changes can still fail in CI if browser selectors depend on fragile text.
- Documentation can drift if final implementation differs from earlier phase decisions and Outcomes are not updated.
- A final rebuild can include generated churn unrelated to the implemented source changes if local template data differs.

## Progress

- [x] Map acceptance criteria to verification coverage.
- [x] Add final browser and data-contract checks.
- [x] Add or update compact chart legend / interaction guide for #26.
- [x] Update developer documentation.
- [x] Rebuild generated assets if needed.
- [x] Run full validation.
- [x] Complete manual smoke tests.
- [x] Update phase Outcomes sections.

## Decision Log

- Decision: Keep this as a hardening phase, not a feature phase.
  Reason: The previous phases should each be independently reviewable; final work should prove behavior and document boundaries.
- Decision: Prefer semantic browser checks over pixel-perfect tests.
  Reason: The chart uses SVG and responsive layout; semantic state and visible elements are less brittle than exact colors or coordinates.
- Decision: Treat #26 as final hardening rather than a separate feature phase.
  Reason: Earlier phases already change the visual language; the public release needs one coherent explanation of those semantics, but not a full onboarding system.
- Decision: Update phase Outcomes after implementation.
  Reason: The plan should become a useful audit trail, not just pre-work documentation.
- Decision: Place the compact guide directly under the chart legend.
  Reason: It stays discoverable after tooltip cards appear and remains close to the visual semantics it explains.
- Decision: Keep guide content short and state-based.
  Reason: #26 needs a release guide, not a full tutorial; the guide should explain what users are seeing without competing with chart controls.
- Decision: Document ownership boundaries in `docs/dev/native-esm-architecture.md`.
  Reason: The new link contract, point overlays, Ship Designer grouping, and guide copy cross builder/chart/UI boundaries and need a stable maintenance map.

## Outcomes

Implemented. The chart now has a persistent compact guide under the legend. It explains family/filter colors, research progression lines, Pareto dimming, low-TWR/extreme-mass warning rings, hover/selection/pin outlines including click-again unpinning, and power ladder / Best Available semantics on band metrics.

Final browser checks now cover the guide text and mobile wrapping in addition to the completed #23, #24, and #25 behavior. Developer documentation now records ownership for `driveLinks`, chart line rendering, point visual state, Ship Designer grouping, and guide copy.

Updated source/docs files:

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client/chart/interaction.js`
- `tools/verify_drive_comparison_browser.mjs`
- `docs/dev/native-esm-architecture.md`

Regenerated output:

- `docs/index.html`
- `docs/assets/js/chart/interaction.js`

Validation results:

- `python -m compileall -q tools scripts` passed.
- `node tools/verify_drive_comparison_client_syntax.mjs` passed.
- `node tools/verify_drive_comparison_import_graph.mjs` passed with 0 circular dependency groups and the existing 6 boundary warnings available via `--show-boundary-warnings`.
- `node tools/verify_axis_ticks.mjs` passed.
- `node tools/verify_module_effects.mjs` passed.
- `node tools/verify_drive_comparison_browser.mjs` passed.
- `npm run verify` passed, including `verify:links`.

Manual smoke results:

- Confirmed Ship Designer is visible on desktop and mobile.
- Opened and applied dry-mass calculator values.
- Toggled module performance effects and confirmed the summary updated.
- Confirmed the compact guide explains colors, research lines, Pareto dimming, warning rings, hover/select/pin outlines, click-again unpinning, and power views.
- Confirmed guide text wraps on mobile without overflow.
- Confirmed Korean and English guide text refresh.
- Confirmed research-link rendering remains active without family fallback lines.
- Pinned a combined Pareto-dominated plus impractical point and confirmed overlay visibility, then clicked again to unpin.
- Confirmed chart and dry-mass preset export/apply helpers still restore relevant assumptions.

## Retrospective

The final pass stayed small: one persistent guide, verifier coverage for that guide, and documentation updates. The earlier phases already carried the feature work, so Phase 06 mostly proves and explains the resulting behavior.
