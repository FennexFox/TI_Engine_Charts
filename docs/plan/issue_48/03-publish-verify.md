# Phase 03: Checked-in UI build and verification

## Goal

- Rebuild checked-in UI artifacts from source with the safe UI-only workflow and run final validation/audit.

## Scope

- Run `./scripts/build-wsl.sh` or equivalent default checked-in/UI-only build after source changes.
- Ensure only expected generated UI assets change under `docs/index.html` and `docs/assets/js/**`.
- Run full verification.
- Perform manual smoke checks against the rebuilt page if the environment allows.
- Commit generated UI artifacts separately from source/test phases when safe.

## Non-goals

- Do not run `npm run deploy`.
- Do not run local-game-data rebuild commands.
- Do not inspect generated file contents except to confirm paths changed and no catalog outputs changed.
- Do not modify catalog JSON or generated Markdown catalogs.

## Affected files

- `docs/index.html`
- `docs/assets/js/**`
- Possibly no source files unless validation fixes are required.

## Implementation steps

- Run the safe WSL build helper.
- Check git status for expected generated UI artifact paths only.
- Run `npm run verify`.
- Record validation/manual smoke results in the phase evidence.
- Run final audit against issue, plan, phase evidence, generated-file policy, and commit flow.

## Acceptance criteria

- Build succeeds without local Terra Invicta templates.
- Generated output changes are limited to checked-in UI artifacts.
- `npm run verify` passes.
- Manual smoke confirms mission dV preset behavior and 1000 slider max in the rebuilt page or records why manual smoke was not run.

## Validation commands

- ./scripts/build-wsl.sh
- npm run verify

## Manual smoke tests

- In `docs/index.html` served locally or opened through the verifier, confirm the mission preset select appears near Target dV.
- Select `All Earth Defense`; Target dV should become 8 km/s.
- Enter 51 manually; select should show `Custom`.
- Enter 200 manually; select should show `Kuiper Belt Assault`.
- Confirm Target dV slider max is 1000 and number input can represent values above 1000.
- Switch to Korean and confirm the new control is localized.

## Rollback risks

- Build may touch generated UI assets; rollback should regenerate from source after reverting source changes.
- If verification fails due to missing Playwright browser dependencies, document the exact failure and run the narrower available validation commands.

## Evidence

- Baseline: No generated output for this issue exists yet.
- After: Pending.
- Delta: Pending.
- Interpretation: Pending.
- Commit: TODO
- Commit blocker: TODO

## Progress

- Not started.

## Decision log

- No decisions recorded yet.

## Outcomes / Retrospective

- Not completed yet.
