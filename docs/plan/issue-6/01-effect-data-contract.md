# Phase 01 - Effect Data Contract

## Goal

Define an explicit data contract for module effects that is separate from module mass, crew, and module power draw. This phase should make supported, unsupported, and prerequisite-like effects visible in normalized data without changing chart calculations.

## Scope

- Inventory current utility module `specialRules` and `specialValue` usage.
- Add or document a normalized effect shape for utility modules, such as `effects: []`, while preserving existing `specialRules` and `specialValue`.
- Cover MVP effect categories:
  - thrust multiplier.
  - exhaust velocity / Isp multiplier.
  - prerequisite metadata needed to decide whether a modifier can apply.
- Cover follow-up placeholders:
  - power demand.
  - waste heat.
  - radiator mass.
  - compatibility and mutual exclusion.
- Keep all runtime behavior unchanged.

## Non-Goals

- Do not apply effects to chart calculations yet.
- Do not add UI controls yet.
- Do not change localStorage keys or preset payload formats yet.
- Do not implement full Terra Invicta ship designer validation.

## Affected Files

- `tools/build_ship_catalog.py`
- `data/ship_catalog.json`
- `docs/ship_catalog.md`
- Potential new documentation note in `docs/dev/native-esm-architecture.md`
- Potential new source helper only if useful: `tools/drive_comparison_client/calc/module_effects.js`
- Generated app assets only after rebuild, if a source/client helper is added.

## Implementation Steps

1. Add a small normalization helper in `tools/build_ship_catalog.py` that maps raw `specialModuleRules` and `specialModuleValue` to a stable effect descriptor list.
2. Preserve raw fields:
   - keep `specialRules`.
   - keep `specialValue`.
   - add new fields rather than replacing old ones.
3. For known MVP rules, emit descriptors:
   - `ThrustMultiplier` -> `{ type: "thrustMultiplier", multiplier: value }`.
   - `EVMultiplier` -> `{ type: "exhaustVelocityMultiplier", multiplier: value }`.
4. For prerequisite-like rules, emit metadata descriptors or `requirements`:
   - `RequiresFissionDrive`.
   - `RequiresFusionDrive`.
   - `RequiresNuclearDrive`.
   - `RequiresHydrogenPropellant`.
   - `RequiresNonISRUDrive`.
5. For all other rules, preserve them in an `unsupportedRules` or `unmodeledRules` field for later UI warnings.
6. Update `docs/ship_catalog.md` generation to include a short interpretation note for module effects.
7. Rebuild catalog outputs from Terra Invicta templates when template data is available.
8. If template data is not available, keep this phase as a source-code-only PR and defer generated catalog refresh to an environment with templates.

## Acceptance Criteria

- Existing module mass data remains unchanged.
- Existing dry-mass calculator behavior is unchanged.
- Raw `specialRules` and `specialValue` remain available for backwards compatibility.
- MVP-relevant modules such as Antimatter Spiker, Muon Spiker, Neutronium Spiker, Liquid Hydrogen Containment, Slush Hydrogen Tankage, and Hydron Trap have explicit normalized descriptors.
- Unsupported rules are represented as unsupported or unmodeled, not dropped.
- No chart metric changes occur in this phase.

## Validation Commands

```powershell
python -m compileall -q tools scripts
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
npm run verify
```

If generated catalog files are refreshed:

```powershell
python tools/build_ship_catalog.py
python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push
npm run verify
```

## Manual Smoke Tests

- Open the dry-mass calculator.
- Select several utility modules with and without special rules.
- Confirm displayed dry mass, crew, and module power totals match the pre-phase behavior.
- Confirm chart values do not change solely because a special-rule module is selected.
- Inspect exported dry-mass preset JSON and confirm existing fields still appear.

## Rollback Risks

- Generated `data/ship_catalog.json` may churn if local Terra Invicta template data differs from the current committed source.
- A poorly designed descriptor name can become hard to migrate once presets start storing assumptions.
- If raw special rule fields are accidentally removed, existing dry-mass assumptions and future compatibility work lose useful source data.

## Progress

- [x] Read the generator, current catalog output, and dry-mass calculator debug surface.
- [x] Added normalized module effect descriptors while preserving raw `specialRules` and `specialValue`.
- [x] Added normalized prerequisite metadata and unmodeled rule placeholders.
- [x] Rebuilt generated catalog data, catalog documentation, and embedded app data.
- [x] Ran phase validation commands.
- [x] Ran manual dry-mass calculator smoke tests.

## Decision Log

- Decision: Preserve raw module rule fields and add explicit normalized descriptors.
  Reason: This avoids breaking existing dry-mass mass handling and keeps future rule coverage possible.
- Decision: Do not apply effects in this phase.
  Reason: Data shape should be reviewable before any behavioral changes.
- Decision: Emit `effects`, `effectRequirements`, and `unmodeledRules` as separate fields.
  Reason: Multipliers, prerequisite gates, and later modeling backlog items have different consumers and should not be conflated.
- Decision: Bump the ship catalog schema version to `3`.
  Reason: The generated catalog now exposes additional structured fields even though existing fields remain compatible.
- Decision: Do not copy ambiguous `specialValue` values into `unmodeledRules`.
  Reason: Several raw rules can share one module-level value, so preserving the raw field is safer until each unsupported rule is modeled explicitly.
- Decision: Refresh generated catalog and embedded page data in this phase.
  Reason: Local template data was available, and the phase acceptance criteria require MVP modules to expose normalized descriptors in the shipped catalog.

## Outcomes

- Added a generator-side normalization helper in `tools/build_ship_catalog.py`.
- `data/ship_catalog.json` now includes normalized descriptors for Antimatter Spiker, Muon Spiker, Neutronium Spiker, Liquid Hydrogen Containment, Slush Hydrogen Tankage, Hydron Trap, and other modules with known raw rules.
- Raw `specialRules` and `specialValue` remain in generated module entries.
- `docs/ship_catalog.md` documents the new module effect interpretation fields.
- `docs/index.html` was regenerated so the embedded app data matches the refreshed catalog.
- Validation passed:
  - `python -m compileall -q tools scripts`
  - `node tools/verify_drive_comparison_client_syntax.mjs`
  - `node tools/verify_drive_comparison_import_graph.mjs`
  - `python tools/build_ship_catalog.py`
  - `python scripts/rebuild_pages.py --ui-only --input-html-data docs/index.html --no-commit --no-push`
  - `npm run verify`
- Manual smoke passed in Playwright:
  - Opened the dry-mass calculator.
  - Selected a ship class and utility modules with and without special rules.
  - Confirmed displayed dry mass, crew, and module power still match the existing mass-only behavior.
  - Confirmed chart mass options did not change because of selected special-rule modules.
  - Confirmed exported dry-mass preset JSON still exposes existing fields.

## Retrospective

- The generator-local contract kept the runtime change surface small and independently reviewable.
- The main residual risk is descriptor naming becoming public API too early; later behavioral phases should continue to treat these fields as catalog contract and avoid storing duplicated interpretations in presets.
