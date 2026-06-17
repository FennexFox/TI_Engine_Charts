# Phase 03: Build, verify, and final audit

## Goal

- Rebuild published UI output, run full verification, audit generated-file policy and commit flow, and prepare final report.

## Scope

- Run `npm run build` to refresh `docs/index.html` and `docs/assets/js/**` from source.
- Run `npm run verify`.
- Record validation results and final diff boundaries.
- Exclude unrelated tracked graphify watcher output unless explicitly needed for issue #44.
- Complete final audit and commit generated/source changes as the implementation phase output if safe.

## Non-goals

- Do not manually edit generated output.
- Do not run `npm run deploy`.
- Do not perform local-game-data rebuilds.
- Do not inspect generated output contents except as needed for status and validation.

## Affected files

- Source files changed in Phase 02.
- Generated published UI output under `docs/index.html` and `docs/assets/js/**`.
- Plan files in `dev-docs/plan/issue_44/**`.

## Implementation steps

- Run `npm run build`.
- Run `npm run verify`.
- Check `git status --short` and `git diff --name-only` for unrelated files.
- Run Phase Gate for Phase 02 and Phase 03.
- Read audit guide and record final audit.
- Commit implementation/build changes if validation passes or document blocker if not.

## Acceptance criteria

- `npm run build` passes.
- `npm run verify` passes or a concrete verifier limitation is documented.
- Final diff contains only plan files, scoped source files, and allowed generated UI output.
- Issue #44 acceptance criteria are satisfied.

## Validation commands

- `npm run build`
- `npm run verify`
- `python /home/fennexfox/.codex/skills/phased-issue-implementation/scripts/phase_plan_helper.py phase-gate --file dev-docs/plan/issue_44/02-implementation.md`
- `python /home/fennexfox/.codex/skills/phased-issue-implementation/scripts/phase_plan_helper.py phase-gate --file dev-docs/plan/issue_44/03-verification.md`

## Manual smoke tests

- `npm run verify:browser` is included in `npm run verify` and acts as the language-switch smoke test.

## Rollback risks

- Build may update generated docs assets broadly; rollback requires reverting generated files and source together.

## Evidence

- Baseline: No source implementation changes before Phase 02.
- After: TODO
- Delta: TODO
- Interpretation: TODO
- Commit: TODO
- Commit blocker: TODO

## Progress

- Pending Phase 02 completion.

## Decision log

- No decisions recorded yet.

## Outcomes / Retrospective

- Not completed yet.
