# Phase 01: Discovery, boundaries, and plan gate

## Goal

- Establish issue scope, repository constraints, affected files, validation commands, and a gated phased plan before touching source code.

## Scope

- Read the issue body and current client localization imports.
- Confirm generated-file and build policies from repository instructions.
- Create and validate this phased plan.
- Commit the plan/baseline before source implementation.

## Non-goals

- Do not edit source or generated output in this phase.
- Do not run a local-game-data rebuild.
- Do not change runtime behavior.

## Affected files

- `dev-docs/plan/issue_44/00-master-plan.md`
- `dev-docs/plan/issue_44/01-planning.md`
- `dev-docs/plan/issue_44/02-implementation.md`
- `dev-docs/plan/issue_44/03-verification.md`

## Implementation steps

- Refresh issue #44 via `gh issue view`.
- Search source imports for `UI_LANG`, `localText`, `setUiLanguage`, `translateText`, and `applyStaticLanguage`.
- Identify validation commands from `package.json`.
- Populate plan files and run helper validation plus Plan Gate.
- Commit the completed plan when safe.

## Acceptance criteria

- Plan files define concrete scope, non-goals, acceptance criteria, validation, generated-file policy, and stop conditions.
- Plan Gate passes.
- No source or generated UI files are changed in this phase.

## Validation commands

- `python <phased-issue-implementation-skill-dir>/scripts/phase_plan_helper.py validate --plan-dir dev-docs/plan/issue_44`
- `python <phased-issue-implementation-skill-dir>/scripts/phase_plan_helper.py gate --plan-dir dev-docs/plan/issue_44`

## Manual smoke tests

- Not applicable for planning-only phase.

## Rollback risks

- Low rollback risk: remove or revise plan files if the plan gate finds missing scope.

## Evidence

- Baseline: Issue #44 refreshed with no comments and unchanged acceptance criteria; `git status --short` was clean before plan scaffolding.
- After: Plan files populated; helper `validate` passed with `OK: 3 phase file(s)`; helper Plan Gate passed with `OK: generic gate`.
- Delta: Added repository-local phased plan for #44 without editing source or generated UI output.
- Interpretation: Planning scope is concrete enough to proceed to source implementation. The separately running graphify watcher modified tracked `graphify-out` output after plan docs changed; those files are excluded from this phase.
- Commit: Pending phase commit after this phase gate.
- Commit blocker: none known.

## Progress

- Completed.

## Decision log

- `shared/i18n.js` must stay dependency-free to satisfy import boundary checks.
- Static DOM translation remains in `state/core.js` for issue #44.

## Outcomes / Retrospective

- Plan Gate passed. Source implementation may start after committing this planning phase.
