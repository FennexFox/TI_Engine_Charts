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

- Baseline: pending.
- After: pending.
- Delta: pending.
- Interpretation: pending.
- Commit: pending.
- Commit blocker: pending.

## Progress

- Not started.

## Decision log

- Decision: final completion requires evidence for each live GitHub acceptance criterion, not just passing tests.

## Outcomes / Retrospective

- Not completed yet.
