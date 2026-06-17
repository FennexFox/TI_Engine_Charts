# Extract shared localization helper from chart state

## Issue Target And Scope Summary

- Issue target: #44
- Title: Extract shared localization helper from chart state
- Source plan: None
- Work type: refactor
- Scope: Extract dynamic Korean/English language state and `localText()` from `tools/drive_comparison_client/state/core.js` into a dependency-light shared client module, then update existing callers and generated published output through the normal build.

## Plan Contract

- User-visible problem or feature outcome: Existing language switching and localized dynamic UI copy keep working while localization no longer requires importing chart state.
- Implementation scope: Add `tools/drive_comparison_client/shared/i18n.js`; move active language initialization, persistence, setter, getter, and `localText()` there; update source imports that currently read `UI_LANG`, `localText()`, or `setUiLanguage()` from `state/core.js`; keep `translateText()` and static DOM translation logic in `state/core.js` because they depend on embedded static translation data.
- Non-goals: Do not change persisted chart state shape; do not rewrite preset, dry-mass, chart-rendering, or control flows; do not consolidate static template localization; do not edit generated files by hand; do not refresh Terra Invicta catalog data from a local install.
- Acceptance criteria that can fail: `state/core.js` no longer defines active language state or `localText()`; source modules import dynamic localization helpers from `shared/i18n.js`; language switching still updates controls, presets, dry-mass modal text, chart diagnostics, and chart guide labels; build and verification pass or failures are documented.
- Validation commands: `npm run build`; `npm run verify`; targeted import/localization searches with `rg`.
- Manual smoke tests: Covered by `npm run verify:browser`, which changes `#uiLanguageSelect` and checks localized dynamic UI areas; no separate manual browser session planned unless automated browser verification fails.
- Files likely to change: `tools/drive_comparison_client/shared/i18n.js`; `tools/drive_comparison_client/state/core.js`; source modules under `tools/drive_comparison_client/{app,calc,chart,presets,ui}` that import `UI_LANG`, `localText()`, or `setUiLanguage()`; generated published output under `docs/index.html` and `docs/assets/js/**`; this plan directory.
- Files that must not change: Generated catalog data (`data/generated/*.json`, `docs/research_catalog.md`, `docs/ship_catalog.md`) and unrelated graphify output unless the separately running watcher updates it incidentally; no local-game-data rebuild paths.
- Generated artifact policy: Source files are edited first. `npm run build` is the only allowed way to refresh published UI output. Generated artifacts are not manually inspected beyond git status/diff names and validation needs.
- Stop conditions: Stop before implementation if Plan Gate fails; stop if import graph cycles or shared-boundary violations appear; stop if language state cannot be extracted without changing persisted state or static localization semantics; document any verifier/environment blocker.

## Strategy

- Keep `shared/i18n.js` dependency-free so it passes the client import boundary verifier.
- Export a live `UI_LANG` binding for existing read patterns and a small API (`setUiLanguage`, `currentLanguage`, `localText`) for future callers.
- Update import lists without changing copy, control flow, or persisted state.
- Let the existing controller continue orchestrating full language refresh by calling `setUiLanguage()`, `applyStaticLanguage()`, `refreshLocalizedControls()`, and `render()`.
- Run the default checked-in UI build, then the full verifier.

## Phase Order

1. [Discovery, boundaries, and plan gate](01-planning.md)
2. [Extract localization module and update imports](02-implementation.md)
3. [Build, verify, and final audit](03-verification.md)

## Phase Dependencies

- Phase 1 has no phase dependency beyond resolved issue context.
- Phase 2 depends on completion and validation of phase 1.
- Phase 3 depends on completion and validation of phase 2.

## Source Of Truth Decisions

- `00-master-plan.md` is the phased implementation plan source of truth.
- Phase files in this directory define phase-local scope and validation.
- The source of truth for browser client behavior is `tools/drive_comparison_client/**`; published `docs/**` files are generated output.
- Static template localization remains in `state/core.js` for this issue.

## Generated-file Policy

- Do not edit generated files directly.
- Use `npm run build` for the safe checked-in/UI-only build after source changes.
- Do not run local-game-data rebuilds or `npm run deploy`.
- If the graphify watcher modifies tracked `graphify-out` files, exclude those changes from issue commits unless explicitly needed.

## Global Validation Expectations

- `npm run build` must complete after source changes and before full verification.
- `npm run verify` must complete, including client syntax, import graph, and browser language checks.
- Targeted searches must confirm dynamic localization no longer originates in `state/core.js`.

## Known Risks And Assumptions

- `UI_LANG` is an ES module live binding, so existing imported reads should keep observing updates after `setUiLanguage()`.
- The main regression risk is stale imports from `state/core.js` or accidentally making `shared/i18n.js` depend on a higher-level module.
- The build may rewrite generated published UI assets even when source changes are small.

## Completion Classification Rules

- Complete: Dynamic localization helper/state extracted, callers updated, generated UI output rebuilt, validation passes, and final audit finds no issue-scope gaps.
- Partially complete: Source extraction works but generated output or some lower-risk validation remains incomplete with documented reason.
- Preparation / instrumentation only: Only plan/discovery changes land.
- Blocked: Extraction cannot proceed safely because of unresolved user work, import cycles, missing required tooling, or verifier environment failure after mitigation attempts.
- Needs follow-up issue: Static localization consolidation or broader UI copy cleanup is identified but intentionally out of scope.

## Final Audit Checklist

- [x] Final diff reviewed against issue body and user request.
- [x] Final diff reviewed against this master plan.
- [x] Phase acceptance criteria checked.
- [x] Validation results recorded.
- [x] Manual smoke test results recorded or explicitly deferred.
- [x] Generated-file policy followed.
- [x] Phase-sized commit flow audited.
- [x] Commit blockers documented when phase-sized commits were skipped.
- [x] Commit-flow classification assigned.
- [x] Completion classification assigned honestly.

## Commit Audit Requirements

- Phase-sized commits required: yes, unless the user explicitly says not to commit.
- Plan / baseline phase commit expectation: commit before source implementation when the plan or baseline changed.
- Per-phase commit expectation: commit each implementation phase separately when staging is safe.
- Commit blocker policy: document blocker in the relevant phase plan and final report before proceeding without a phase commit.
- Generated artifact policy: include generated artifacts only when repository policy requires them.
- Commit-flow non-compliance outcome: report separately in Final Audit even if implementation works.

## Final Audit

- Completion classification: Complete.
- Completed: Dynamic localization state and `localText()` moved to `tools/drive_comparison_client/shared/i18n.js`; source callers updated to import dynamic localization from the shared module; `state/core.js` keeps static translation logic but no longer defines active language state or `localText()`; published client assets regenerated through `npm run build`.
- Not completed: Static template localization consolidation remains intentionally out of scope; graphify semantic update was not run for plan docs.
- Validation: `npm run build` passed; `npm run verify` passed; targeted searches found no moved localization definitions in `state/core.js`, no `UI_LANG`/`localText`/`setUiLanguage` imports from `state/core.js`, and no imports in `shared/i18n.js`.
- Manual smoke tests: Covered by `npm run verify:browser`, which passed against `docs/index.html`.
- Generated-file policy: Followed. Generated published client assets under `docs/assets/js/**` were produced by `npm run build`; generated catalog files and local-game-data rebuild paths were not touched.
- Commit audit:
  - Phase-sized commits made: yes.
  - Plan / baseline committed before source implementation: yes, `4f3c9b4 Plan issue 44 localization refactor`.
  - Source implementation committed separately: yes, `211072c Extract drive comparison i18n helper`.
  - Generated output / validation evidence committed separately: yes, `49c8812 Build published client i18n assets`.
  - Generated artifacts policy followed: yes.
  - Unrelated changes excluded: yes. Graphify watcher output was left unstaged and excluded from issue commits.
  - Commit-flow classification: compliant.
- Known risks: Existing import-boundary verifier still reports pre-existing boundary warnings when requested, but no cycles and no new shared-module dependency violation were introduced.
- Follow-up recommendation: Consider a separate issue only if static template localization should be consolidated later.
