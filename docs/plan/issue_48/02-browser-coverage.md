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

- npm run verify:browser

## Manual smoke tests

- Covered by automated Playwright browser verification in this phase. Manual browser smoke remains in phase 3 after rebuilt assets exist.

## Rollback risks

- Moderate rollback risk: the browser verifier is broad and long-running, so keep assertions local and deterministic.
- If chart output wording changes, prefer state/input/render-evidence assertions over brittle full text matching.

## Evidence

- Baseline: Existing browser verification covers Target dV through presets and dry-mass flows but does not cover mission preset UI because it does not exist.
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
