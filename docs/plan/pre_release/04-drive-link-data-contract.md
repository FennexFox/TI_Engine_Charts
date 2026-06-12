# Phase 04 - Drive Link Data Contract

## Goal

Generate an explicit `driveLinks` data contract that projects research dependencies onto visible drive nodes, without changing chart rendering yet.

## Scope

- Add generated drive-to-drive research links in `tools/build_drive_comparison.py`.
- Use existing `ResearchCostIndex.closure()` behavior for prerequisite interpretation.
- Keep family/subfamily metadata for color and filtering.
- Avoid links between drives that only share a family but have no research dependency path.
- Avoid links between drive variants that share the same required project.
- Suppress transitive shortcut links where another drive sits between source and target.
- Add deterministic validation for the generated link contract.

## Non-Goals

- Do not switch the renderer to `DATA.driveLinks` in this phase.
- Do not change family filters, category filters, or legend behavior.
- Do not change research catalog generation unless a bug in existing research graph data blocks this phase.
- Do not infer links dynamically in the browser client.

## Affected Files

- `tools/build_drive_comparison.py`
- Potential new verifier: `tools/verify_drive_links.mjs` or a Python verifier under `tools/`
- `package.json` if a new verifier is added to npm scripts
- Generated `docs/index.html` after a data rebuild
- Generated `docs/assets/js/**` only if rebuild copies client modules

## Implementation Steps

1. Add a pure builder helper, for example `build_drive_links(drive_rows, research)`.
2. Generate candidate links among drive rows that:
   - Have different IDs.
   - Have the same `thrusterCount`.
   - Have non-empty and different `requiredProject` values.
   - Share the same `familyKey` unless a later explicit decision allows cross-family research lines.
   - Satisfy `source.requiredProject in research.closure(target.requiredProject)`.
3. Remove transitive shortcuts. If A links to B and B links to C, suppress A to C.
4. Emit stable link objects such as:

```json
{
  "from": "DriveAId",
  "to": "DriveBId",
  "familyKey": "Fusion:Z_Pinch_Fusion",
  "kind": "projectedResearchDependency"
}
```

5. Sort links deterministically by family, thruster count, source, and target.
6. Add `driveLinks` to the returned DATA object and update `schemaVersion` if the embedded data contract changes.
7. Add a short `method.driveLinks` note describing projected research dependency links and transitive reduction.
8. Add validation that checks:
   - All link endpoints exist in `drives`.
   - Endpoints have the same `thrusterCount`.
   - Endpoints do not share the same `requiredProject`.
   - `from.requiredProject` is in `closure(to.requiredProject)`.
   - Transitive reduction is validated against the same projected candidate graph used by the builder, not only against the final emitted edge list.
   - No emitted shortcut remains when another candidate-visible drive path exists between the same endpoints.
   - At least some known fusion families retain useful links when template data is available.
9. Rebuild generated page data from Terra Invicta templates when available.

## Acceptance Criteria

- DATA includes a deterministic `driveLinks` array.
- Every link represents an actual projected research dependency.
- Family-only relationships without research dependency do not produce links.
- Links are not generated between variants sharing the same required project.
- Transitive shortcut links are suppressed.
- Verification validates transitive reduction against the projected candidate graph, not just the final emitted `driveLinks` list.
- Existing rendered chart behavior is unchanged in this phase.
- The verifier fails on invalid or misleading generated links.

## Validation Commands

With Terra Invicta templates available:

```powershell
npm run build
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
npm run verify
```

If a standalone verifier is added, it should recompute or reuse the builder's projected candidate graph before checking for emitted shortcut links:

```powershell
node tools/verify_drive_links.mjs
```

Source-only fallback when templates are unavailable:

```powershell
python -m compileall -q tools scripts
node tools/verify_drive_comparison_client_syntax.mjs
node tools/verify_drive_comparison_import_graph.mjs
```

## Manual Smoke Tests

- Inspect a generated DATA sample in the browser debug console and confirm `DATA.driveLinks` exists.
- Confirm several fusion paths produce expected progression links.
- Confirm fission or electromagnetic families that only share visual grouping no longer produce family-only links in generated data.
- Confirm the chart still renders exactly as before this phase, since the renderer has not switched to `driveLinks` yet.

## Rollback Risks

- Local Terra Invicta template differences can churn generated output.
- A too-broad projection can add cross-family clutter; a too-narrow projection can miss useful progression.
- Transitive reduction over drive variants can accidentally remove valid parallel links if variants are not grouped by thruster count.
- A verifier that checks only the final emitted edge list can miss invalid shortcuts that were already collapsed out of the reduced graph context.
- Bumping schema without renderer compatibility can break old generated pages if fallback assumptions are missing.

## Progress

- [ ] Add builder helper for projected drive links.
- [ ] Add deterministic link sorting and DATA field.
- [ ] Add contract validation.
- [ ] Rebuild generated data where available.
- [ ] Run validation commands.
- [ ] Complete manual smoke tests.

## Decision Log

- Decision: Generate links in the build step, not in the browser.
  Reason: The builder already owns research closure and avoids duplicating graph logic in the client.
- Decision: Start with same-family projected dependency links.
  Reason: #24 is about replacing family-only lines with dependency-backed family progression lines, and this is the conservative visual change.
- Decision: Use research closure and transitive reduction.
  Reason: The #24 implementation note recommends closure projection while suppressing shortcut edges.

## Outcomes

Pending implementation.
