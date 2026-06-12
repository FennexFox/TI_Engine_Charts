# Issue 6 Post-Implementation Audit and Follow-Up Plan

## Purpose

Re-check the Phase 01-10 implementation record against the current repository and identify which items are complete, which were intentionally deferred, and which need a follow-up pass.

This is an audit and planning document. It does not change application behavior.

Product-scope lens for this audit:

- The app's core job is to help users compare thrusters by showing the research-cost and performance tradeoff needed to reach a desired propulsion capability.
- Module effects are in scope only when they change propulsion metrics already shown by the chart, such as thrust, EV/Isp, power demand, waste heat, radiator mass, dry mass, total mass, TWR, or practical dV.
- Ship-design, combat, survivability, and automatic recommendation systems are outside this issue's product goal. They may produce warnings when selected modules cannot be modeled, but they should not become follow-up implementation targets here.

## Audit Summary

- Phase 01-06 MVP scope is implemented and recorded with progress, decisions, outcomes, validation, and retrospective sections.
- Phase 07-10 follow-up scope is implemented where the phase explicitly chose a bounded model.
- The repository has matching code evidence for the documented contracts:
  - normalized module effect data in `tools/build_ship_catalog.py` and `data/ship_catalog.json`.
  - pure evaluator in `tools/drive_comparison_client/calc/module_effects.js`.
  - state/preset plumbing in `tools/drive_comparison_client/state/core.js` and `tools/drive_comparison_client/presets/library.js`.
  - runtime calculation integration in `tools/drive_comparison_client/calc/filtering.js`.
  - UI summaries and diagnostics in `tools/drive_comparison_client/ui/control_state.js`, `tools/drive_comparison_client/ui/dry_mass_calculator.js`, and `tools/drive_comparison_client/ui/tooltip_table.js`.
  - deterministic and browser coverage in `tools/verify_module_effects.mjs` and `tools/verify_drive_comparison_browser.mjs`.
- The main residual work is not broken implementation; it is deliberately deferred product scope:
  - user-facing documentation for explicit propulsion-assumption payloads.
  - diagnostics for imported propulsion/module assumptions that were accepted, normalized, dropped, or ignored.
  - reactor capacity validation under modified propulsion power demand.
  - production-data-backed heat modules beyond verifier fixtures.
  - optional built-in propulsion-assumption examples, only if they do not imply optimality.
- Full ship-designer legality, weapon-specific semantics, combat rules, and automatic optimization should remain warnings or explicit non-goals, not follow-up targets for this issue.

## Phase-by-Phase Assessment

| Phase | Audit Result | Evidence | Remaining or Deferred Scope |
| --- | --- | --- | --- |
| 01 - Effect Data Contract | Appropriate. The contract exists and generated data was refreshed. | `tools/build_ship_catalog.py` emits `effects`, `effectRequirements`, and `unmodeledRules`; `data/ship_catalog.json` is schema version `3`. | Contract names are now effectively public. Future rule additions should extend the schema rather than reinterpret existing fields. |
| 02 - Pure Effect Evaluator | Appropriate. The evaluator is pure and covered by fixtures. | `evaluateModuleEffectsForDrive()` is in `calc/module_effects.js`; `tools/verify_module_effects.mjs` covers supported effects, prerequisites, unsupported rules, power, heat, mutual exclusion, and missing modules. | Drive-class inference remains heuristic. If source data gains explicit drive tags, replace inference with generated metadata. |
| 03 - State and Preset Plumbing | Appropriate. Defaults are safe and old presets are covered. | `moduleEffectsEnabled`, `moduleEffectSource`, and `moduleEffectModuleIds` live in state and exported presets; browser tests cover legacy payloads and round trips. | No full manual module-list editor exists. Manual IDs are mainly restored through presets/debug paths, while normal UX uses dry-mass selections. |
| 04 - MVP Thrust and EV Calculation | Appropriate. MVP effects are wired through calculation hooks and `massOptions()`. | `effectiveDriveValues()` feeds thrust, EV/Isp, mass ratio, propellant, total mass, TWR, and max practical dV. | Power and heat were intentionally deferred here and later covered in Phase 07-08. |
| 05 - MVP UX and Warnings | Appropriate. Users can see enabled state, source, chips, and warnings. | `#moduleEffectsControl`, `updateModuleEffectsPanel()`, dry-mass slot chips, and tooltip module-effect details exist. | Warning density can still grow for complex imports. A grouped warning summary remains useful follow-up polish. |
| 06 - MVP Verification Hardening | Appropriate. Standard verification now exercises the MVP. | `package.json` runs `verify:effects`; browser tests cover preset formats, warnings, and named presets. | Browser tests are broad and growing. Future work should split scenario helpers before the file becomes hard to maintain. |
| 07 - Power Demand Follow-Up | Appropriate for the chosen model. Auxiliary utility power is added to modified drive power and shown separately from base power. | Evaluator returns `basePowerRequirementGW`, `modifiedPowerRequirementGW`, `moduleAuxiliaryPowerGW`, and `powerWarnings`; `powerRequirementGW` metric reads effective power. | Reactor candidate lists are still build-time lists. Modified power can outgrow assumptions behind the displayed options unless a later pass validates capacity compatibility. Weapon-only power bonuses remain warnings. |
| 08 - Waste Heat and Radiator Follow-Up | Appropriate for the chosen model. Modified power and heat multipliers flow into waste heat/radiator mass. | `massOptions()` exposes base/modified heat and radiator fields; tooltip breakdown displays base-vs-modified values. | Current production catalog has no explicit heat-specific module rule, so supported heat multiplier coverage is fixture-based. Future source data should be audited before claiming broad thermal parity. |
| 09 - Compatibility Validation Follow-Up | Appropriate. Known prerequisites and same-group mutual exclusions prevent false application while keeping selection permissive. | Structured diagnostics include unmet requirements, unsupported rules/effects, mutual exclusions, impossible combinations, power warnings, and heat warnings. | This is not complete ship-designer validation and should not become one under this issue. Only imported-payload drop reporting remains relevant to the current propulsion-assumption boundary. |
| 10 - Ship Design Import and Advanced Workflows | Appropriate for an explicit assumption-payload boundary. The phase did not implement a save parser, by design. | `ti-engine-chart-ship-assumption/v1` import applies dry-mass calculator state and module-effect assumptions; table base badges and Performance Detail base/total display were added. | User-facing import schema docs, dropped-module reporting, and tightly scoped assumption examples remain relevant. Full save-design import, chart clutter, and optimization helpers should not be treated as this issue's follow-up roadmap. |

## Acceptance-Criteria Review

- Existing default/no-module behavior: covered by deterministic and browser no-op checks.
- Supported effects visible and deterministic: covered for thrust, EV/Isp, auxiliary power, and heat multiplier fixtures.
- Unsupported effects visible: covered through panel and tooltip warnings.
- Preset compatibility: covered for old payloads, JSON, compressed payloads, named chart presets, and clean-profile round trips.
- Advanced workflows: partially complete. Explicit assumption import and table comparison are implemented. Future work should harden that boundary, not expand into save-design parsing, whole-ship workflows, or automatic optimization.

## Scope Boundaries

### Intentional Non-Goals

- Full Terra Invicta ship-designer parity.
- Combat performance, survivability, weapon-effect, or battle-outcome modeling.
- Server-side calculation.
- Automatic module optimization.
- Automatic thruster, module, reactor, or ship-design recommendations.
- Hard-blocking invalid dry-mass selections.
- Parsing raw game save files or opaque ship designs.
- Dynamic reactor candidate generation from scratch.

### Deliberately Warned Instead of Modeled

- `LaserPowerBonus`.
- `ParticleBeamPowerBonus`.
- `ECM`.
- `TargetingComputer`.
- `Magazine`.
- `RotationalThrust`.
- damage-mitigation rules such as `RadHardened`.
- repair/utility combat rules that do not map to engine chart metrics.

### Implemented Through Fixture Contract, Not Current Production Data

- `WasteHeatMultiplier` is supported in the contract and evaluator, but current generated production utility modules do not appear to provide a heat-specific rule that exercises it naturally.

## Follow-Up Plan

### Follow-Up 01 - Documentation and Schema Hardening

Goal: Make the new assumptions import and module-effect model understandable outside the implementation plans.

Scope:
- Add a user/developer document for `ti-engine-chart-ship-assumption/v1`.
- Include minimal valid JSON examples for:
  - dry-mass only.
  - dry-mass plus module effects from calculator slots.
  - dry-mass plus manual module-effect IDs.
- Add a short "not a game save or ship-design parser" warning.
- Keep Phase 10 retrospective notes in sync when the import or base-vs-total display changes.

Acceptance criteria:
- A contributor can create a valid assumption payload without reading `presets/library.js`.
- The docs clearly distinguish explicit assumption payloads from raw saves, full ship designs, and recommendation workflows.
- Existing `npm run verify` remains green.

Validation:

```powershell
npm run verify
```

### Follow-Up 02 - Import Diagnostics and Dropped-Module Reporting

Goal: Make imported assumptions safer by reporting what was accepted, normalized, dropped, or ignored.

Scope:
- Track modules dropped by dry-mass calculator normalization because of hull slot count, construction tier, unknown IDs, or `Empty`.
- Surface a concise import result summary in the dry-mass preset status area.
- Extend browser tests for an import payload with one valid module, one unknown module, and one module not allowed for the selected hull.

Non-goals:
- Do not block import.
- Do not implement full ship-designer legality.
- Do not infer combat loadouts, weapon behavior, or optimal module choices from an imported payload.

Acceptance criteria:
- Importing invalid or partially invalid module assumptions does not silently hide dropped data.
- The calculator remains editable after import.
- Clean valid payloads continue importing without warning noise.

Validation:

```powershell
node tools/verify_drive_comparison_browser.mjs docs/index.html
npm run verify
```

### Follow-Up 03 - Reactor Capacity Warning Validation

Goal: Ensure module-modified propulsion power demand cannot make the chart display an impossible retained power candidate without a visible warning.

Scope:
- Audit whether every retained power option can satisfy `modifiedPowerRequirementGW` under auxiliary power.
- If not, add a diagnostic and optionally filter invalid power candidates only when doing so preserves current research-cost and drive-comparison semantics.
- Keep base and modified power fields visible.
- Add focused browser tests for an auxiliary-power scenario that crosses a reactor max-output boundary.

Non-goals:
- Do not rebuild all reactor candidate generation in the browser unless diagnostics prove filtering is insufficient.
- Do not add reactor/module optimization or automatic recommendations.

Acceptance criteria:
- Modified power demand cannot silently use an under-capacity reactor candidate.
- Power ladder modes remain selectable and tested.
- Tooltip explains any candidate filtered or warned due to modified power demand.

Validation:

```powershell
node tools/verify_module_effects.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
npm run verify
```

### Follow-Up 04 - Production Heat Rule Audit

Goal: Move heat support from fixture-proven readiness to production-data confidence.

Scope:
- Re-inventory current and target game template utility rules for heat/radiator semantics.
- Confirm whether any rule maps cleanly to `WasteHeatMultiplier` or a different operation.
- Extend `tools/build_ship_catalog.py` only when source semantics are clear.
- Add production-catalog-backed browser smoke if a real module exists.

Non-goals:
- Do not invent thermal formulas for ambiguous combat or survivability rules.
- Do not model combat damage mitigation, repair, targeting, or weapon performance.

Acceptance criteria:
- Every production heat-like rule is either modeled with a documented formula or explicitly warned.
- Fixture-only coverage remains, but at least one real-data path is tested if source data supports it.

Validation:

```powershell
npm run build:fast
npm run verify
```

### Follow-Up 05 - Warning UX Consolidation

Goal: Keep warnings readable as imported assumptions and unsupported modules grow.

Scope:
- Group panel warnings by category:
  - active effects.
  - unmet prerequisites.
  - mutual exclusions.
  - unsupported rules.
  - ignored/dropped import data.
- Keep tooltip warnings deduplicated and compact.
- Add browser checks for warning grouping instead of only raw warning text.

Non-goals:
- Do not hide critical warnings behind hover-only UI.

Acceptance criteria:
- A complex assumption payload is understandable without scanning a long flat warning list.
- Existing single-module warning cases remain concise.

Validation:

```powershell
node tools/verify_drive_comparison_browser.mjs docs/index.html
npm run verify
```

### Follow-Up 06 - Optional Assumption Examples

Goal: Decide whether curated propulsion-assumption examples are worth shipping as documentation aids.

Scope:
- Prototype optional built-in dry-mass or chart examples in `data/preset_library.json`.
- Candidate examples:
  - no module effects.
  - selected dry-mass modules source.
  - one clearly labeled thrust/EV module-effect demonstration.
  - one clearly labeled auxiliary-power warning demonstration.
- Keep defaults unchanged.

Non-goals:
- Do not make examples imply optimality, recommendation, or best-build guidance.
- Do not add catalog-maintenance-heavy examples unless tests protect them.
- Do not add combat, whole-ship, or progression-planning presets.

Acceptance criteria:
- Examples are optional, localized well enough for current UI, and do not alter startup defaults.
- Built-in example import/export and language display continue working.

Validation:

```powershell
npm run build:fast
npm run verify
```

## Explicitly Not Scheduled Here

These ideas appeared in earlier planning language but should not be follow-up implementation targets for this issue:

- Full ship-design import from Terra Invicta saves or opaque ship-design blobs.
- Any parser that maps weapons, armor, combat utilities, or battle simulation defaults.
- Automatic optimization, "best module" selection, or recommended build generation.
- Combat-performance, survivability, repair, targeting, magazine, ECM, or weapon-damage modeling.
- Chart overlays or extra visual layers that make the research-cost/performance comparison harder to scan.

If any of these are ever pursued, they should be opened as a separate product decision with a scope that does not redefine this app as a full ship design calculator.

## Recommended Order

1. Follow-Up 01 - Documentation and Schema Hardening.
2. Follow-Up 02 - Import Diagnostics and Dropped-Module Reporting.
3. Follow-Up 03 - Reactor Capacity Warning Validation.
4. Follow-Up 05 - Warning UX Consolidation.
5. Follow-Up 04 - Production Heat Rule Audit.
6. Follow-Up 06 - Optional Assumption Examples.

Rationale: Document the public contract first, then make explicit assumption imports safer, then validate the largest remaining propulsion-calculation risk. Optional examples come last because they are only useful after assumptions and diagnostics are easy to explain.
