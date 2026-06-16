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
- `tools/verify_drive_comparison_browser.mjs` if validation fixes are required.
- `tools/drive_comparison_template.html` if validation finds a source/build mismatch.

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
- After: `./scripts/build-wsl.sh` rebuilt `docs/index.html` and `docs/assets/js/**` from checked-in embedded data. Generated changes are limited to `docs/index.html`, `docs/assets/js/main.js`, `docs/assets/js/presets/library.js`, `docs/assets/js/presets/runtime.js`, and `docs/assets/js/ui/controls.js`; catalog JSON/Markdown outputs did not change.
- Delta: Validation found the Target dV range still used `step=5`, which rounded low mission presets such as 8 km/s to 10 in the range input. The source template now uses `step=1`, generated output was rebuilt, and browser coverage now checks every mission preset value exactly.
- Interpretation: Build, focused smoke, and full verification pass. The local bundled Playwright Chromium cannot launch because the host lacks `libnspr4.so`; validation passed by using the existing snap Chromium through `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/snap/bin/chromium`.
- Validation: `./scripts/build-wsl.sh` passed; `node --check tools/verify_drive_comparison_browser.mjs` passed; focused Playwright smoke for `All Earth Defense`, `Custom`, `Kuiper Belt Assault`, above-slider numeric input, and Korean localization passed; `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/snap/bin/chromium npm run verify` passed.
- Manual smoke tests: Covered by focused Playwright smoke against rebuilt `docs/index.html`; no separate human browser click-through was run.
- Commit: Pending phase commit after phase gate.
- Commit blocker: None; staging is limited to generated UI assets, phase 3 plan evidence, source validation fix, and browser verifier validation fixes.

## Progress

- Build, validation fixes, focused smoke, and full verification complete; phase gate pending.

## Decision log

- Used `/snap/bin/chromium` through the verifiers' existing `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` support because the bundled Playwright Chromium is missing system library `libnspr4.so` in this WSL environment.
- Kept the Target dV number input max at 100000, lowered the range max to 1000, and changed the range step to 1 so every mission preset can synchronize exactly.
- Updated stale browser verifier expectations for the current compact chart guide and `driveFilter` card while adding mission dV coverage.

## Outcomes / Retrospective

- Completed checked-in UI build and validation. The issue-specific generated output is present, and all validation passed with the documented Chromium executable override.
