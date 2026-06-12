# Phase 09 - Compatibility Validation Follow-Up

## Goal

Add explicit prerequisite, compatibility, and mutual-exclusion validation for module effects so users get reliable warnings for unsupported ship/module/drive combinations.

## Scope

- Validate known prerequisite rules from utility modules.
- Add warning categories for unsupported, unmet, mutually exclusive, and impossible combinations.
- Distinguish:
  - effect not relevant to selected drive.
  - effect relevant but unmet prerequisite.
  - effect unsupported by the app.
  - effect deliberately out of scope.
- Keep invalid combinations from silently modifying chart metrics.

## Non-Goals

- Do not enforce every Terra Invicta designer rule.
- Do not prevent users from selecting modules in the dry-mass calculator unless the existing mass calculator already does so.
- Do not add automatic module optimization.
- Do not import saved ship designs yet.

## Affected Files

- `tools/drive_comparison_client/calc/module_effects.js`
- `tools/drive_comparison_client/calc/dry_mass_model.js`
- `tools/drive_comparison_client/ui/dry_mass_calculator.js`
- `tools/drive_comparison_client/ui/tooltip_table.js`
- `tools/drive_comparison_client/state/core.js`
- `tools/verify_module_effects.mjs`
- `tools/verify_drive_comparison_browser.mjs`
- Generated `docs/index.html` and `docs/assets/js/` after rebuild.

## Implementation Steps

1. Build a validation rule map for known prerequisite-like rules:
   - `RequiresFissionDrive`.
   - `RequiresFusionDrive`.
   - `RequiresNuclearDrive`.
   - `RequiresHydrogenPropellant`.
   - `RequiresNonISRUDrive`.
2. Add drive classification helpers that work from existing drive row fields.
3. Add module group/mutual-exclusion checks where current catalog data supports them.
4. Emit structured diagnostics:
   - severity.
   - module ID.
   - rule.
   - localized message key or plain fallback.
   - applied/not applied.
5. Update UI warning display to group diagnostics and avoid duplicate spam.
6. Add tests for representative compatible and incompatible modules.
7. Add browser checks that incompatible modules produce warning text and do not change values.

## Acceptance Criteria

- Known prerequisites are checked before applying effects.
- Incompatible modules do not modify effective drive values.
- Users can distinguish unsupported effects from unmet prerequisites.
- Duplicate warnings are grouped or deduplicated.
- Dry-mass selection remains permissive unless a separate product decision changes it.
- Existing no-module and compatible-module scenarios continue passing.

## Validation Commands

```powershell
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

## Manual Smoke Tests

- Select Antimatter Spiker and compare nuclear vs non-nuclear drives.
- Select Muon Spiker and compare fusion vs fission/non-fusion drives.
- Select hydrogen tankage and compare hydrogen vs non-hydrogen propellant drives.
- Select several unsupported modules and confirm warnings stay readable.
- Toggle effects off and confirm warnings explain disabled behavior or disappear according to chosen UX.

## Rollback Risks

- Drive classification inferred from display/category fields may be fragile.
- Too-aggressive validation can hide useful approximate comparisons.
- Warning volume can make the dry-mass modal difficult to use.

## Progress

- [x] Confirmed current utility-module catalog exposes prerequisite-like rules and `grouping` values usable for validation.
- [x] Added structured diagnostics fields (`severity`, `rule`, `category`, `messageKey`, `applied`) for unmet requirements, unsupported rules/effects, skipped effects, power/heat warnings, mutual exclusions, and unresolved-module impossible combinations.
- [x] Added mutual-exclusion validation for selected modules sharing the same non-negative catalog `grouping`.
- [x] Kept invalid combinations permissive in selection UI but prevented mutually exclusive or unmet-prerequisite effects from modifying chart metrics.
- [x] Updated tooltip and module-effects panel warnings to show unmet prerequisites, unsupported rules, impossible selections, and mutually exclusive module groups without duplicate tooltip spam.
- [x] Extended deterministic and browser tests for representative compatible, incompatible, unsupported, mutually exclusive, and missing-module scenarios.
- [x] Rebuilt generated UI assets.
- [x] Validation completed:
  - `node tools/verify_module_effects.mjs`
  - `node tools/verify_drive_comparison_browser.mjs docs/index.html`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- [x] Manual smoke completed for Antimatter Spiker nuclear/non-nuclear behavior, Muon Spiker fusion/fission behavior, Hydron Trap hydrogen/non-hydrogen behavior, unsupported-module warning readability, and disabled-effects messaging.

## Decision Log

- Decision: Warnings first, hard blocking later if ever needed.
  Reason: The app is a comparison tool, not a full ship designer.
- Decision: Use structured diagnostics.
  Reason: Tooltips, controls, tests, and future imports can consume the same validation result.
- Decision: Treat same positive utility-module `grouping` values as mutually exclusive for effect application.
  Reason: The current catalog exposes this grouping consistently for spikers, tankage, ECM, targeting computers, and similar mutually exclusive module families.
- Decision: Block all conflicting grouped modules from modifying metrics instead of choosing a winner.
  Reason: Picking one silently would hide an invalid assumption; warning-only selection remains permissive but calculations stay honest.
- Decision: Represent unresolved module IDs as `impossibleCombination` diagnostics while keeping the legacy `unresolvedModules` field.
  Reason: Existing callers can keep using the old field, and UI/tests get a structured category for impossible selections.
- Decision: Keep dry-mass module selection permissive.
  Reason: Phase 09 explicitly avoids turning the dry-mass calculator into a full designer validator.

## Outcomes

- Known drive/propellant prerequisites are checked before effect application and report structured unmet-requirement diagnostics.
- Same-group selected utility modules now emit mutual-exclusion diagnostics and do not affect modified thrust/EV/power/heat values.
- Unsupported and impossible selections are visible as diagnostics without changing chart values.
- Tooltip warnings are deduplicated, and the module-effects panel summarizes mutually exclusive groups.
- Tests and manual smoke cover representative compatible, incompatible, unsupported, and mutually exclusive module assumptions.

## Retrospective

- What worked: Reusing catalog `grouping` avoided adding new data or hard-coded module family lists.
- What to watch: `grouping` is inferred as mutual exclusivity for effect validation only; future full ship-designer compatibility may need stricter slot/type rules.
- Follow-up scope: Phase 10 can reuse the structured diagnostics when importing ship designs or surfacing saved-design assumptions.

