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

- [ ] Not started.

## Decision Log

- Decision: Warnings first, hard blocking later if ever needed.
  Reason: The app is a comparison tool, not a full ship designer.
- Decision: Use structured diagnostics.
  Reason: Tooltips, controls, tests, and future imports can consume the same validation result.

## Outcomes

- Pending.

