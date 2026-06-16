# Add mission-based target dV presets

## Issue Target And Scope Summary

- Issue target: #48
- Title: Add mission-based target dV presets
- Source plan: None
- Work type: generic
- Scope: Add a lightweight mission dV preset selector next to the existing Target dV control, keep manual Target dV editing authoritative, lower the Target dV range slider max to 1000 km/s, add browser coverage, and rebuild checked-in UI assets with the safe UI-only workflow.

## Plan Contract

- User-visible problem or feature outcome: Simulation Conditions exposes a `Mission dV preset` select near Target dV. Selecting a listed mission writes the matching dV to the chart state and both Target dV inputs without changing unrelated simulation, filter, display, power-view, module-effect, or ship-design assumptions.
- Implementation scope: Add the mission select to `tools/drive_comparison_template.html`; wire source client state/input synchronization in `tools/drive_comparison_client/ui/controls.js`; keep preset/import state synchronization current through the preset runtime API if needed; add Korean/English static strings; lower the Target dV range input `max` from 2000 to 1000; add browser verification for mission preset and manual edit behavior; run the default checked-in data build so published UI assets match source.
- Non-goals: Do not create full chart presets for each mission; do not overwrite dry mass, radiator, filters, categories, families, metric, power view, module effects, or ship design assumptions when applying a mission dV preset; do not infer travel-time-optimal trajectories; do not refresh Terra Invicta catalog data from a local game install.
- Acceptance criteria that can fail: The control is present near Target dV; all nine issue-listed mission options select the listed km/s value; the Target dV range and number inputs stay synchronized; manual edits set `Custom` unless the value exactly equals a mission value; exact manual matches reselect the matching mission; applying a mission re-renders chart output; chart presets and dry-mass/design presets still sync Target dV; Korean and English strings are covered; the Target dV range max is 1000; build and verification pass.
- Validation commands: `npm run verify:js`; `npm run verify:browser`; `./scripts/build-wsl.sh`; `npm run verify`.
- Manual smoke tests: In the generated page, switch to English and Korean; select `Jupiter Assault` and confirm Target dV becomes 50 km/s; manually set Target dV to 51 and confirm the mission select shows `Custom`; manually set Target dV to 150 and confirm `Fast Asteroid Assault` is selected; confirm slider max is 1000 and a manual numeric value above 1000 remains possible through the number input.
- Files likely to change: `tools/drive_comparison_template.html`; `tools/drive_comparison_client/ui/controls.js`; `tools/drive_comparison_client/presets/runtime.js`; `tools/drive_comparison_client/presets/library.js`; `tools/drive_comparison_client/main.js`; `tools/drive_comparison_i18n.py`; `tools/verify_drive_comparison_browser.mjs`; generated checked-in UI files under `docs/index.html` and `docs/assets/js/**` after the safe UI-only build.
- Files that must not change: Terra Invicta catalog source/output data such as `data/generated/research_catalog.json`, `data/generated/ship_catalog.json`, `docs/research_catalog.md`, and `docs/ship_catalog.md`; `data/preset_library.json` unless a validation failure proves a fixture update is required.
- Generated artifact policy: Source review and implementation should target `tools/**` and `scripts/**`. Generated `docs/index.html` and `docs/assets/js/**` may change only through the safe default UI-only build. No local-game-data rebuild should be run.
- Stop conditions: Stop before source edits if the plan gate fails; stop if the issue requires local Terra Invicta template data; stop if generated catalog outputs change during the UI-only build; stop if validation reveals mission selection mutates unrelated state.

## Strategy

- Keep the mission dV feature local to the existing Simulation Conditions target dV control rather than introducing a chart preset type.
- Represent the mission list as source client UI data so it can drive option sync and exact-match detection.
- Reuse the existing target dV state and render path: mission selection updates `state.targetDvKps`, both Target dV inputs, the mission select, and then calls `render()`.
- Make manual Target dV input changes call the same mission-select sync helper so `Custom` and exact mission matches stay current.
- Ensure state-to-UI synchronization used by chart presets, imports, and dry-mass design defaults also updates the mission select.
- Add focused Playwright verification to exercise real DOM behavior and then rebuild published client assets from source with checked-in chart data.

## Phase Order

1. [Source UI and state sync](01-source-ui.md)
2. [Browser regression coverage](02-browser-coverage.md)
3. [Checked-in UI build and verification](03-publish-verify.md)

## Phase Dependencies

- Phase 1 has no phase dependency beyond resolved issue context.
- Phase 2 depends on completion and validation of phase 1.
- Phase 3 depends on completion and validation of phase 2.

## Source Of Truth Decisions

- `00-master-plan.md` is the phased implementation plan source of truth.
- Phase files in this directory define phase-local scope and validation.
- Earlier monolithic plans are input material only unless explicitly retained.

## Generated-file Policy

- The source files under `tools/**` are the source of truth for the browser client and generated page.
- `docs/index.html` and `docs/assets/js/**` are generated publication artifacts and should not be hand-edited or reviewed for content beyond noting generated output changed.
- `npm run build` / `./scripts/build-wsl.sh` is the only intended build path for this issue; no local-game-data rebuild is in scope.

## Global Validation Expectations

- npm run verify:js
- npm run verify:browser
- ./scripts/build-wsl.sh
- npm run verify

## Known Risks And Assumptions

- Mission presets are rough gameplay helper values copied exactly from issue #48.
- The Target dV number input intentionally keeps its wider `max=100000` so manual and imported values above the slider range continue to work.
- Lowering the Target dV range max to 1000 is compatible with all requested mission presets because the highest preset is 500 km/s.
- Existing startup chart presets may initialize Target dV to values that match a mission option; the mission select should reflect the current state rather than always starting on `Custom`.

## Completion Classification Rules

- Complete: Source UI, synchronization, localization, browser coverage, checked-in UI build, and full validation are done with no generated catalog churn.
- Partially complete: The feature works but one requested validation path could not be run or a non-critical generated UI artifact could not be rebuilt.
- Preparation / instrumentation only: Only plan or tests are added without shipping the user-visible control.
- Blocked: A required validation or build dependency is unavailable after reasonable local attempts, or local state prevents safely committing phase-sized changes.
- Needs follow-up issue: The requested rough mission presets expose broader trajectory/preset modeling needs outside issue #48's lightweight helper scope.

## Final Audit Checklist

- [ ] Final diff reviewed against issue body and user request.
- [ ] Final diff reviewed against this master plan.
- [ ] Phase acceptance criteria checked.
- [ ] Validation results recorded.
- [ ] Manual smoke test results recorded or explicitly deferred.
- [ ] Generated-file policy followed.
- [ ] Phase-sized commit flow audited.
- [ ] Commit blockers documented when phase-sized commits were skipped.
- [ ] Commit-flow classification assigned.
- [ ] Completion classification assigned honestly.

## Commit Audit Requirements

- Phase-sized commits required: yes, unless the user explicitly says not to commit.
- Plan / baseline phase commit expectation: commit before source implementation when the plan or baseline changed.
- Per-phase commit expectation: commit each implementation phase separately when staging is safe.
- Commit blocker policy: document blocker in the relevant phase plan and final report before proceeding without a phase commit.
- Generated artifact policy: include generated artifacts only when repository policy requires them.
- Commit-flow non-compliance outcome: report separately in Final Audit even if implementation works.
