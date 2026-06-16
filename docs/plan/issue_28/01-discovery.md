# Phase 01: Discovery and boundaries

## Goal

- Resolve issue requirements, repository conventions, and the implementation boundary before
  changing preset behavior.

## Scope

- Read issue #28 and confirm acceptance criteria.
- Inspect preset source modules, preset builder loading, existing browser verification, and
  the hand-maintained built-in preset library shape.
- Create the phased implementation plan and record key decisions.

## Non-goals

- No converter implementation in this phase.
- No runtime behavior changes in this phase.
- No generated output review beyond understanding source ownership.

## Affected files

- `docs/plan/issue_28/00-master-plan.md`
- `docs/plan/issue_28/01-discovery.md`
- `docs/plan/issue_28/02-converter.md`
- `docs/plan/issue_28/03-runtime-guard.md`

## Implementation steps

- Read issue #28 from GitHub.
- Inspect current worktree status and branch state.
- Review preset repository/library code paths and builder preset-library loading.
- Define phase scope, validation, and smoke tests.

## Acceptance criteria

- Plan identifies where converter, runtime guard, documentation, and tests should land.
- Plan documents source-of-truth and generated-file boundaries.
- Phase 2 and phase 3 can be implemented independently and committed separately.

## Validation commands

- python /home/fennexfox/.codex/skills/phased-issue-implementation/scripts/phase_plan_helper.py validate --plan-dir docs/plan/issue_28

## Manual smoke tests

- Not applicable for discovery-only changes.

## Rollback risks

- Removing this plan loses implementation traceability but does not affect shipped app
  behavior.

## Progress

- Issue context read from GitHub.
- Source paths reviewed: preset repository/library modules, preset codec/common helpers,
  builder preset-library loading, README built-in preset notes, and browser preset
  verification coverage.
- Plan created under `docs/plan/issue_28/`.

## Decision log

- Use a Python CLI under `tools/` for the repository-side converter.
- Keep runtime hardening as a separate phase from the converter so the script can be reviewed
  independently.
- Do not inspect generated page/client output for planning; use source files and the normal
  build workflow.

## Outcomes / Retrospective

- Discovery completed. The implementation surface is small: one new converter script,
  README/script validation, and one built-in apply guard plus browser verification.
