# Pre-Release Refactor Master Plan

Issues:

- #23: https://github.com/FennexFox/TI_Engine_Charts/issues/23
- #24: https://github.com/FennexFox/TI_Engine_Charts/issues/24
- #25: https://github.com/FennexFox/TI_Engine_Charts/issues/25
- #26: https://github.com/FennexFox/TI_Engine_Charts/issues/26

## Objective

Address the pre-release UI/UX issues without turning them into one large change. The refactor should keep the browser app working after every phase, preserve generated-artifact discipline, leave each phase small enough to review on its own, and make the public chart self-explanatory enough for first-time users.

## Issue Summary

- #23 asks for clearer chart point state affordances. Low-TWR or otherwise impractical candidates, Pareto-dominated candidates, hover, selection, and pinning currently overlap visually. Clicking an already pinned point should unpin it.
- #24 asks for family colors and family filters to remain, but drive progression lines should represent actual research dependency relationships rather than shared family membership alone. The issue comment recommends generated `driveLinks` projected from research closure and rendered by the client.
- #25 asks for a dedicated Ship Designer or Ship Configuration area inside Simulation Conditions that exposes the dry-mass calculator, module performance effects, and the currently applied ship template status.
- #26 asks for a concise chart legend and interaction guide so first-time users can understand family colors, research progression lines, Pareto/impractical states, pinning, hover, and power-ladder semantics without reading the source or issue tracker.

## Current Repository Findings

- The browser client source lives in `tools/drive_comparison_client/`. Published copies under `docs/assets/js/` are generated and should not be edited directly.
- `tools/drive_comparison_template.html` currently places the dry-mass calculator icon button and `#moduleEffectsControl` as sibling blocks inside the Simulation Conditions card.
- `tools/drive_comparison_client/ui/dry_mass_calculator.js` owns the dry-mass modal and selected ship design state. `tools/drive_comparison_client/state/core.js` owns `dryMassCalcState`, module-effect assumptions, and left-panel summaries.
- `tools/drive_comparison_client/ui/control_state.js` owns `updateModuleEffectsPanel()`, which already summarizes selected module effects and warnings.
- `tools/drive_comparison_client/chart/rendering.js` currently groups rows by `familyKey` for line drawing. It also computes band point opacity from secondary encoding and Pareto state in `bandPointVisual()`.
- `tools/drive_comparison_client/chart/interaction.js` owns click, hover, zoom, and legend behavior. `handleChartClick()` currently pins visible hit targets; it does not toggle an already pinned point off.
- `tools/drive_comparison_client/ui/tooltip_table.js` owns pin state mutations and already supports card-level pin toggles.
- `tools/build_drive_comparison.py` already has `ResearchCostIndex.closure()` and each drive row already includes `requiredProject`, `familyKey`, and `thrusterCount`. This is enough to generate projected drive-to-drive research links in the builder.
- `tools/verify_drive_comparison_browser.mjs` already validates pin-card behavior, power-ladder focus, left-panel persistence, and general browser rendering. It is the right place to add end-to-end checks for these issues.
- Existing legend/help text is updated in the interaction/rendering phases, but #26 should be tracked explicitly in the final hardening phase so the public release has a coherent visual and interaction guide rather than scattered copy changes.

## Refactor Strategy

1. Improve the Simulation Conditions information architecture first. This is a contained UI phase and reduces later ambiguity around module-effect controls.
2. Split chart point visual semantics before changing pin behavior. This lets low-TWR, Pareto, and secondary encodings be reviewed without also changing interaction.
3. Move selection and pin affordances into an overlay that is not inherited from the data point opacity, then add click-to-unpin.
4. Add an explicit generated `driveLinks` data contract before changing line rendering. This makes the data projection independently reviewable.
5. Switch chart line rendering to consume `DATA.driveLinks`, while keeping family grouping for color, filtering, and legend identity.
6. Run a final hardening and guide phase that expands browser validation, documents the new visual/data contracts, and explicitly closes #26 with a compact chart legend / interaction guide.

## Cross-Phase Invariants

- Each phase must leave the app usable and `npm run verify` passing unless a phase document explicitly marks a narrower source-only validation path.
- Source client edits go in `tools/drive_comparison_client/**`; generated `docs/assets/js/**` changes come only from rebuilds.
- Generated catalog and page output should not be hand-edited. Use builders and rebuild scripts.
- Family and category filtering semantics must remain stable.
- Existing dry-mass calculator behavior, module-effect behavior, chart presets, and dry-mass presets must continue to work.
- If a phase cannot regenerate data because local Terra Invicta templates are unavailable, keep the phase source-only and use UI-only rebuild from existing embedded data.

## Recommended Validation Baseline

For source-only UI/client phases:

```powershell
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

For data-contract phases that need Terra Invicta templates:

```powershell
npm run build
npm run verify
```

For targeted iteration:

```powershell
python -m compileall -q tools scripts
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs
```

## Phase Index

1. [Phase 01 - Ship Designer Section](./01-ship-designer-section.md)
2. [Phase 02 - Chart Point Visual Encoding](./02-chart-point-visual-encoding.md)
3. [Phase 03 - Pinning and Selection Overlay](./03-pinning-selection-overlay.md)
4. [Phase 04 - Drive Link Data Contract](./04-drive-link-data-contract.md)
5. [Phase 05 - Drive Link Rendering](./05-drive-link-rendering.md)
6. [Phase 06 - Pre-Release Verification and Legend Hardening](./06-pre-release-verification-hardening.md)

## Done Definition

- #23 acceptance criteria are covered by visual encoding, overlay, click-to-unpin, legend/help text, and browser smoke tests.
- #24 acceptance criteria are covered by generated research dependency links, renderer consumption of those links, and verification that family-only links are no longer drawn.
- #25 acceptance criteria are covered by the Ship Designer section, visible dry-mass calculator entry point, grouped module effects, applied-template status, and unchanged dry-mass/module behavior.
- #26 acceptance criteria are covered by a compact chart legend / interaction guide that explains color, line, point-state, hover, pinning, and power-ladder semantics in the final public build.
- The final implementation includes source changes, regenerated published assets where needed, and validation results recorded in each phase outcome section.

## Repository Safety Notes

- This planning step adds documentation only under `docs/plan/pre_release/`.
- Do not edit application code as part of this planning step.
- Future implementation phases should avoid broad review of generated data unless the phase explicitly changes data generation or validates generated output.
