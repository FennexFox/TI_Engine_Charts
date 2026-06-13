# Issue 33 Master Plan: Actionable Filter Warnings And Search States

## Objective

Implement issue #33 as a phased refactor that makes hidden drive states and search results actionable without rebuilding the existing filter system. The source of truth remains the browser client in `tools/drive_comparison_client/**`; generated files in `docs/**` are updated only through the build.

## Current Repository Findings

- Visibility is centralized in `tools/drive_comparison_client/calc/filtering.js`.
- `evaluateDriveVisibility(row)` already returns reason keys, but search, family/category, and engine-count filtering are collapsed into `familyFilter`.
- `computeDriveDiagnostics()` already feeds visible rows, family warning counts, and zero-family chart diagnostics.
- `tools/drive_comparison_client/chart/interaction.js` owns chart-level diagnostic rendering and can host the new banner model/render flow.
- `tools/drive_comparison_client/presets/library.js` exposes `syncUiFromState()`, which is the safest way for action buttons to synchronize controls after state mutation.
- `tools/verify_drive_comparison_browser.mjs` already has broad Playwright coverage and debug helpers for mutating chart state.

## Refactor Strategy

1. Split diagnostics first while preserving existing visible rows and family warning behavior.
2. Add the chart-level actionable banner and direct actions using the new diagnostics.
3. Add verifier coverage after the UI behavior is in place.

Each phase must keep `npm run build` and `npm run verify` green unless a phase plan explicitly narrows validation for source-only changes. The published page and generated client assets must be rebuilt through `npm run build`.

## Phase List

1. [01-diagnostics-model.md](01-diagnostics-model.md)
   - Split actionable hidden reasons and add global/search hidden summaries.
   - No new visible UI beyond keeping existing diagnostics working.

2. [02-action-banner-ui.md](02-action-banner-ui.md)
   - Add the chart-level actionable banner, copy, styles, and action handlers.
   - Reuse diagnostics from phase 1 and existing state sync helpers.

3. [03-browser-verifier.md](03-browser-verifier.md)
   - Add browser verifier coverage for the new hidden-state behavior, action buttons, and localization.
   - Keep assertions resilient by checking key phrases and state transitions instead of whole sentences.

## Cross-Phase Invariants

- Do not directly edit generated `docs/index.html` or `docs/assets/js/**`.
- Regenerate generated output with `npm run build` after source changes.
- Preserve existing exports and return fields from diagnostics.
- Prefer "Acceleration", "minimum acceleration", or "acceleration threshold" in user-facing English copy.
- Internal identifiers such as `minTwr` may remain unchanged.
- Korean UI should use Korean copy via `localText()` or static translation mappings; English UI must not show Korean source text.
- Search itself should not be counted as the reason matching rows are hidden in search diagnostics.
- Each phase must leave the app usable and reviewable on its own.

## Validation Policy

Every phase runs:

```powershell
npm run build
npm run verify
```

Manual smoke tests are performed through the browser verifier and, where feasible, Playwright-driven page state checks matching the phase plan.

## Commit Policy

After each acceptable phase:

1. Update the phase document's Progress, Decision Log, and Outcomes / Retrospective.
2. Run the listed validation commands and smoke tests.
3. Commit only the completed phase scope and generated output from the build.
4. Continue directly to the next phase.

## Risks

- Diagnostic splitting could accidentally change which rows are visible. Mitigation: preserve `evaluation.visible` semantics and validate with full verifier.
- Banner actions could desynchronize controls if state is mutated directly. Mitigation: call `syncUiFromState()` or existing sync helpers after mutations.
- Localization can regress because static template text uses replacement mappings while dynamic JS uses `localText()`. Mitigation: keep new dynamic copy in JS and add static mappings only for new template text.
- Browser verifier runtime is long and touches many workflows. Mitigation: run full `npm run verify` after each phase despite the cost.

## Status

- Created: 2026-06-13
- Source plan replaced: `docs/plan/issue_33/implementation_plan.md`
- Execution status: completed
- Completed phases:
  - Phase 1 diagnostics model: `45aa180`
  - Phase 2 action banner UI: `1966b32`
  - Phase 3 browser verifier coverage: `8dc854e`
