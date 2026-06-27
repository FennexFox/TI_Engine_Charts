# Phase 04: Validation, generated output, and final audit

## Goal

- Regenerate required artifacts, run validation, and audit issue #53 completion against the live issue acceptance criteria and this plan.

## Scope

- Run the documented safe default build.
- Run full verification when feasible.
- Record targeted evidence that normal builds do not use `docs/index.html` as durable data input.
- Review generated artifact changes only for expected scope.
- Complete final audit and commit-flow audit.

## Non-goals

- Do not use `npm run deploy` for validation.
- Do not manually review large generated `docs/**` content beyond targeted assertions.
- Do not claim freshness of local game data unless a from-game rebuild was run against a known local install/version.

## Affected files

- `dev-docs/plan/issue_53/*.md`
- Expected generated artifacts: `data/generated/drive_catalog.json`, `docs/index.html`, `docs/assets/js/**`
- Documentation files if build workflow docs need final updates.

## Implementation steps

- Run phase gates for all completed phase files.
- Run `npm run build`.
- Run `npm run verify` or document exact failed/unavailable subcommands and cause.
- Use targeted checks for catalog schema, chart data source metadata, drive ID stability, localization fields, and detail-card fallback support.
- Update Evidence, Progress, Decision log, and Outcomes / Retrospective sections in each phase.
- Run final audit using the audit guide and classify completion honestly.

## Acceptance criteria

- Required generated artifacts are updated by documented commands.
- Validation command results are recorded with pass/fail status.
- Every GitHub acceptance criterion has direct evidence or is explicitly classified incomplete.
- Commit audit records phase-sized commits or documented blockers.
- Final report states Complete, Partially complete, Preparation / instrumentation only, Blocked, or Needs follow-up issue without overstating.

## Validation commands

- `npm run build`
- `npm run verify`
- `python /home/fennexfox/.codex/skills/phased-issue-implementation/scripts/phase_plan_helper.py gate --plan-dir dev-docs/plan/issue_53`
- `python /home/fennexfox/.codex/skills/phased-issue-implementation/scripts/phase_plan_helper.py phase-gate --file <phase-file>`

## Manual smoke tests

- Inspect generated chart `source` metadata with a targeted parser.
- Inspect representative drive row metadata for stable ID, localized display, and localized description/fallback behavior.
- If browser verification is unavailable, record the limitation and the closest automated evidence.

## Rollback risks

- Generated artifacts may change broadly after source updates; keep review focused on source and targeted generated-data evidence.
- If full verification is blocked by environment dependencies, final classification may remain partial unless acceptance criteria are otherwise proven.

## Evidence

- Baseline: Phase 1-3 implementation commits existed and the worktree was clean before final validation.
- After: `npm run build` passed; `npm run verify` stopped at `verify:reuse`; remaining verification subcommands passed when run directly.
- Delta: targeted audit parser confirmed `data/generated/drive_catalog.json` exists with 541 drive records, 523 enabled drives, 61 power plants, 13 radiators, 541 localized drive names, and 96 localized descriptions. Generated page data has 523 drive rows and source metadata `driveCatalog: "drive_catalog.json"`, `researchCatalog: "research_catalog.json"`, and `shipCatalog: "ship_catalog.json"`.
- Interpretation: Issue #53 acceptance criteria are satisfied except the aggregate `npm run verify` command is blocked by a broad REUSE failure that predates this work and lists many unrelated repository files. Behavior/build/browser gates passed after REUSE.
- Commit: pending final audit commit.
- Commit blocker: none.

## Progress

- Final validation and audit completed. Phase gate pending.

## Decision log

- Decision: final completion requires evidence for each live GitHub acceptance criterion, not just passing tests.
- Decision: classify `npm run verify` as environment/repository-policy blocked at `verify:reuse`, not behavior-blocking, because `verify:python`, `verify:js`, `verify:axis`, `verify:links`, and `verify:browser` all passed when run directly.
- Decision: completion classification is `Complete` with documented validation caveat for aggregate REUSE.

## Outcomes / Retrospective

- Completion classification: Complete.
- Completed: generated drive catalog; from-game catalog generation path; normal build from repo-local catalogs; removal of `docs/index.html` as default data input; localized drive display/description propagation; detail-card description with fallback; generated Pages output; phase-sized commits.
- Not completed / deferred: broad REUSE compliance remains outside issue #53 and pre-existing repository scope.
- Validation: `npm run build` passed; `npm run verify` failed at `verify:reuse`; direct `verify:python`, `verify:js`, `verify:axis`, `verify:links`, and `verify:browser` passed.
- Manual smoke tests: targeted parsers inspected catalog counts, localization counts, generated source metadata, Poseidon/NeutronFlux identity/display separation, and no-description fallback data.
- Generated-file policy: source files and `data/generated/drive_catalog.json` are committed; `docs/index.html` and `docs/assets/js/**` were regenerated through `npm run build`.
- Commit audit: plan commit `d1e2315`; phase commits `f8f2fc2`, `2194719`, `b5281c2`; final audit commit pending.
- Known risks: generated catalog reflects local Terra Invicta version `1.0.38`; future game updates require explicit from-game rebuild.
