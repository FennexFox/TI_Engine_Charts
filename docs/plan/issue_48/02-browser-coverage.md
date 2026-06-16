# Phase 02: Browser regression coverage

## Goal

- Add browser verification that exercises mission dV preset behavior in the generated page and guards the manual/exact-match synchronization rules from issue #48.

## Scope

- Extend `tools/verify_drive_comparison_browser.mjs` with a focused mission dV block.
- Verify control presence, English/Korean localization, option values, mission selection state updates, input synchronization, chart render evidence, manual `Custom`, manual exact-match reselection, unrelated state preservation, and the 1000 slider max.

## Non-goals

- Do not broaden browser verification into unrelated UI workflows.
- Do not inspect generated `docs/**` implementation output during source test authoring.
- Do not require local Terra Invicta templates or a local-game-data rebuild.

## Affected files

- `tools/verify_drive_comparison_browser.mjs`

## Implementation steps

- Add a page-evaluated scenario that starts from a known default chart state.
- Capture unrelated state fields before selecting a mission preset.
- Select `Jupiter Assault` and assert `state.targetDvKps`, `#targetDv`, `#targetDvNumber`, and `#missionDvPreset` sync to 50.
- Assert current rendered chart output reflects the new dV or otherwise changes after selection.
- Manually enter 51 and assert `Custom`.
- Manually enter 150 and assert `Fast Asteroid Assault`.
- Manually enter a value above the slider max and assert the number input/state remain wider while the range input clamps to 1000.
- Switch languages and assert the new label/options localize without mixed-language text.

## Acceptance criteria

- Browser verification fails before the source implementation or if any mission dV sync requirement regresses.
- Browser verification confirms the mission select does not mutate dry mass, radiator, metric, power view, module effects, or ship design assumptions.
- Browser verification confirms Target dV range max is 1000.

## Validation commands

- node --check tools/verify_drive_comparison_browser.mjs
- npm run verify:browser (deferred to phase 3 after the UI-only build regenerates `docs/index.html` and `docs/assets/js/**`)

## Manual smoke tests

- Covered by automated Playwright browser verification in this phase. Manual browser smoke remains in phase 3 after rebuilt assets exist.

## Rollback risks

- Moderate rollback risk: the browser verifier is broad and long-running, so keep assertions local and deterministic.
- If chart output wording changes, prefer state/input/render-evidence assertions over brittle full text matching.

## Evidence

- Baseline: Existing browser verification covers Target dV through presets and dry-mass flows but does not cover mission preset UI because it does not exist.
- After: `tools/verify_drive_comparison_browser.mjs` includes a mission dV preset scenario that checks control presence, exact option values, English/Korean option text, 1000 slider max, wider number max, mission selection to 50 km/s, chart-guide render evidence, unrelated state preservation, manual `Custom`, manual exact-match reselection, above-slider numeric input behavior, and `syncUiFromState()` mission selection.
- Delta: Browser verifier coverage now encodes issue #48's acceptance rules for mission dV sync. The full browser run is intentionally deferred until phase 3 because the verifier runs against generated `docs/index.html`, which has not yet been rebuilt from source.
- Interpretation: Test coverage is implemented and syntactically valid. It will become executable after the checked-in UI build updates the generated page and client assets.
- Validation: `node --check tools/verify_drive_comparison_browser.mjs` passed. `npm run verify:browser` not run in this phase because it would exercise stale generated UI output before the planned phase 3 rebuild.
- Manual smoke tests: Covered by the automated browser scenario after phase 3 build; manual browser smoke remains in phase 3.
- Commit: Pending phase commit after phase gate.
- Commit blocker: None; staging is limited to issue #48 browser verifier and phase plan files.

## Progress

- Browser coverage implemented; syntax validation complete; full browser execution deferred to phase 3 generated-output validation.

## Decision log

- Browser verification depends on rebuilt `docs/` output, so phase 2 commits the verifier source and phase 3 runs it after the documented UI-only build.

## Outcomes / Retrospective

- Implemented browser regression coverage. Execution of the new coverage is deferred to phase 3 because generated UI assets are intentionally not rebuilt in this phase.
