# Issue 6 Post-Implementation Audit and Follow-Up Plan

## Purpose

Re-check the Phase 01-10 implementation record against the current repository and identify which items are complete, which were intentionally deferred, and which need a follow-up pass.

This is an audit and planning document. It does not change application behavior.

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
  - full Terra Invicta save/ship-design parsing.
  - full ship-designer legality validation.
  - weapon-specific module power semantics.
  - dynamic reactor candidate/frontier recalculation under modified power demand.
  - production-data-backed heat modules beyond verifier fixtures.
  - optional built-in assumption presets and optimization helpers.

## Phase-by-Phase Assessment

| Phase | Audit Result | Evidence | Remaining or Deferred Scope |
| --- | --- | --- | --- |
| 01 - Effect Data Contract | Appropriate. The contract exists and generated data was refreshed. | `tools/build_ship_catalog.py` emits `effects`, `effectRequirements`, and `unmodeledRules`; `data/ship_catalog.json` is schema version `3`. | Contract names are now effectively public. Future rule additions should extend the schema rather than reinterpret existing fields. |
| 02 - Pure Effect Evaluator | Appropriate. The evaluator is pure and covered by fixtures. | `evaluateModuleEffectsForDrive()` is in `calc/module_effects.js`; `tools/verify_module_effects.mjs` covers supported effects, prerequisites, unsupported rules, power, heat, mutual exclusion, and missing modules. | Drive-class inference remains heuristic. If source data gains explicit drive tags, replace inference with generated metadata. |
| 03 - State and Preset Plumbing | Appropriate. Defaults are safe and old presets are covered. | `moduleEffectsEnabled`, `moduleEffectSource`, and `moduleEffectModuleIds` live in state and exported presets; browser tests cover legacy payloads and round trips. | No full manual module-list editor exists. Manual IDs are mainly restored through presets/debug paths, while normal UX uses dry-mass selections. |
| 04 - MVP Thrust and EV Calculation | Appropriate. MVP effects are wired through calculation hooks and `massOptions()`. | `effectiveDriveValues()` feeds thrust, EV/Isp, mass ratio, propellant, total mass, TWR, and max practical dV. | Power and heat were intentionally deferred here and later covered in Phase 07-08. |
| 05 - MVP UX and Warnings | Appropriate. Users can see enabled state, source, chips, and warnings. | `#moduleEffectsControl`, `updateModuleEffectsPanel()`, dry-mass slot chips, and tooltip module-effect details exist. | Warning density can still grow for complex imports. A grouped warning summary remains useful follow-up polish. |
| 06 - MVP Verification Hardening | Appropriate. Standard verification now exercises the MVP. | `package.json` runs `verify:effects`; browser tests cover preset formats, warnings, and named presets. | Browser tests are broad and growing. Future work should split scenario helpers before the file becomes hard to maintain. |
| 07 - Power Demand Follow-Up | Appropriate for the chosen model. Auxiliary utility power is added to modified drive power and shown separately from base power. | Evaluator returns `basePowerRequirementGW`, `modifiedPowerRequirementGW`, `moduleAuxiliaryPowerGW`, and `powerWarnings`; `powerRequirementGW` metric reads effective power. | Reactor candidate lists are still build-time lists. Modified power can outgrow assumptions behind the existing frontier unless a later pass validates capacity/frontier compatibility. Weapon-only power bonuses remain warnings. |
| 08 - Waste Heat and Radiator Follow-Up | Appropriate for the chosen model. Modified power and heat multipliers flow into waste heat/radiator mass. | `massOptions()` exposes base/modified heat and radiator fields; tooltip breakdown displays base-vs-modified values. | Current production catalog has no explicit heat-specific module rule, so supported heat multiplier coverage is fixture-based. Future source data should be audited before claiming broad thermal parity. |
| 09 - Compatibility Validation Follow-Up | Appropriate. Known prerequisites and same-group mutual exclusions prevent false application while keeping selection permissive. | Structured diagnostics include unmet requirements, unsupported rules/effects, mutual exclusions, impossible combinations, power warnings, and heat warnings. | This is not complete ship-designer validation. Slot legality, module quantity legality, alien/buildable constraints, and imported-payload drop reporting need follow-up if ship import expands. |
| 10 - Ship Design Import and Advanced Workflows | Appropriate for an explicit assumption-payload boundary. The phase did not implement a save parser, by design. | `ti-engine-chart-ship-assumption/v1` import applies dry-mass calculator state and module-effect assumptions; table base badges and Performance Detail base/total display were added. | User-facing import schema docs, dropped-module reporting, built-in assumption presets, chart overlays, and optimization helpers remain deferred. |

## Acceptance-Criteria Review

- Existing default/no-module behavior: covered by deterministic and browser no-op checks.
- Supported effects visible and deterministic: covered for thrust, EV/Isp, auxiliary power, and heat multiplier fixtures.
- Unsupported effects visible: covered through panel and tooltip warnings.
- Preset compatibility: covered for old payloads, JSON, compressed payloads, named chart presets, and clean-profile round trips.
- Advanced workflows: partially complete. Explicit assumption import and table comparison are implemented; full save-design import, built-in presets, chart overlay, and optimization are deferred.

## Deferred Scope

### Intentional Non-Goals

- Full Terra Invicta ship-designer parity.
- Server-side calculation.
- Automatic module optimization.
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
- Add a short "not a game save parser" warning.
- Keep Phase 10 retrospective notes in sync when the import or base-vs-total display changes.

Acceptance criteria:
- A contributor can create a valid assumption payload without reading `presets/library.js`.
- The docs clearly distinguish explicit assumption payloads from future save parsing.
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

Acceptance criteria:
- Importing invalid or partially invalid module assumptions does not silently hide dropped data.
- The calculator remains editable after import.
- Clean valid payloads continue importing without warning noise.

Validation:

```powershell
node tools/verify_drive_comparison_browser.mjs docs/index.html
npm run verify
```

### Follow-Up 03 - Reactor Capacity and Dynamic Frontier Validation

Goal: Check whether modified power demand invalidates build-time reactor candidate assumptions.

Scope:
- Audit whether every retained power option can satisfy `modifiedPowerRequirementGW` under auxiliary power.
- If not, add a diagnostic and optionally filter invalid power candidates only when doing so preserves current chart semantics.
- Keep base and modified power fields visible.
- Add focused browser tests for an auxiliary-power scenario that crosses a reactor max-output boundary.

Non-goals:
- Do not rebuild all reactor candidate generation in the browser unless diagnostics prove filtering is insufficient.

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

### Follow-Up 06 - Built-In Assumption Presets

Goal: Decide whether curated module-effect presets are worth shipping.

Scope:
- Prototype optional built-in dry-mass or chart presets in `data/preset_library.json`.
- Candidate presets:
  - no module effects.
  - selected dry-mass modules source.
  - common fusion spiker plus hydrogen tankage.
  - auxiliary-power stress test.
- Keep defaults unchanged.

Non-goals:
- Do not make presets imply optimality.
- Do not add catalog-maintenance-heavy presets unless tests protect them.

Acceptance criteria:
- Presets are optional, localized well enough for current UI, and do not alter startup defaults.
- Built-in preset import/export and language display continue working.

Validation:

```powershell
npm run build:fast
npm run verify
```

### Follow-Up 07 - Ship Design Import Foundation

Goal: Prepare for actual ship design import without coupling the comparison tool to a brittle save parser.

Scope:
- Define accepted source formats separately from `ti-engine-chart-ship-assumption/v1`.
- Add a parser boundary module with fixtures, not UI code.
- Map hull, utility modules, weapons, armor, and simulation defaults with explicit diagnostics.
- Reuse Follow-Up 02 dropped-data reporting.

Non-goals:
- Do not parse every game save structure in the first pass.
- Do not accept opaque save data without schema/version detection.

Acceptance criteria:
- A parser fixture can produce the existing assumption payload shape.
- Import failures are actionable and do not mutate current calculator state.
- The app remains usable without parser support.

Validation:

```powershell
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_browser.mjs docs/index.html
npm run verify
```

### Follow-Up 08 - Optional Optimization Helpers

Goal: Explore recommendation helpers only after the current model is documented and validated.

Scope:
- Add non-authoritative filters or comparison helpers, such as "show assumptions that improve this visible drive".
- Require all recommendations to cite their assumptions and diagnostics.
- Keep automatic module choice out of the default workflow.

Non-goals:
- Do not claim optimal ship design.
- Do not make the app choose modules silently.

Acceptance criteria:
- Any helper remains transparent, reversible, and testable.
- Unsupported or invalid assumptions are never recommended as applied effects.

Validation:

```powershell
npm run verify
```

## Recommended Order

1. Follow-Up 01 - Documentation and Schema Hardening.
2. Follow-Up 02 - Import Diagnostics and Dropped-Module Reporting.
3. Follow-Up 03 - Reactor Capacity and Dynamic Frontier Validation.
4. Follow-Up 05 - Warning UX Consolidation.
5. Follow-Up 04 - Production Heat Rule Audit.
6. Follow-Up 06 - Built-In Assumption Presets.
7. Follow-Up 07 - Ship Design Import Foundation.
8. Follow-Up 08 - Optional Optimization Helpers.

Rationale: Document the public contract first, then make imports safer, then validate the largest remaining calculation risk. Presets and optimization should wait until the assumptions are easier to explain and diagnose.
