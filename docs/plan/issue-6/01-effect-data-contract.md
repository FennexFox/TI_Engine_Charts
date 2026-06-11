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

- [ ] Not started.

## Decision Log

- Decision: Preserve raw module rule fields and add explicit normalized descriptors.
  Reason: This avoids breaking existing dry-mass mass handling and keeps future rule coverage possible.
- Decision: Do not apply effects in this phase.
  Reason: Data shape should be reviewable before any behavioral changes.

## Outcomes

- Pending.

