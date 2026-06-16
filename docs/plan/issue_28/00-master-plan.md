# Add a developer workflow for converting exported presets into built-in presets safely

## Issue Target And Scope Summary

- Issue target: #28
- Title: Add a developer workflow for converting exported presets into built-in presets safely
- Source plan: None
- Scope: add a repository-side helper for converting normal exported chart preset JSON into
  safe built-in entries in `data/preset_library.json`, then harden built-in chart preset
  application so malformed built-in entries cannot restore a user's saved design library.

## Strategy

- Keep the developer workflow in a small Python CLI under `tools/` because this repository
  already uses Python builder scripts for source JSON and generated pages.
- Treat `data/preset_library.json` as the source of truth for built-in presets and format it
  with deterministic `json.dumps(..., indent=2)`.
- Normalize exported payload variants accepted by the client:
  named chart presets, raw chart settings, and full chart exports containing
  `dryMassCalculator`, `designPresetLibrary`, `dryMassPresetLibrary`, and
  `selectedDesignPresetId`.
- Generate stable built-in source IDs from names and existing exported IDs, resolving
  conflicts by appending a numeric suffix instead of overwriting by default.
- Remove `designPresetLibrary` and `dryMassPresetLibrary` from generated chart preset
  settings and rewrite `selectedDesignPresetId` when the selected design was extracted into
  a new built-in design preset.
- Add focused verification for the converter and a runtime browser check that applying a
  built-in chart preset does not replace the user dry-mass preset library.

## Phase Order

1. [Discovery and boundaries](01-discovery.md)
2. [Preset conversion script and documentation](02-converter.md)
3. [Runtime built-in preset safety guard](03-runtime-guard.md)

## Phase Dependencies

- Phase 1 has no phase dependency beyond resolved issue context.
- Phase 2 depends on completion and validation of phase 1.
- Phase 3 depends on completion and validation of phase 2.

## Source Of Truth Decisions

- `00-master-plan.md` is the phased implementation plan source of truth.
- Phase files in this directory define phase-local scope and validation.
- No earlier local plan exists for issue #28.
- `tools/drive_comparison_client/**` remains the browser client source. Published
  `docs/assets/js/**` is generated output.
- `data/preset_library.json` is hand-maintained input and may be edited by the new
  converter. Catalog JSON and generated docs remain out of scope.

## Global Validation Expectations

- npm run build
- npm run verify

## Known Risks And Assumptions

- The converter supports JSON export files, not compressed `ticp1:` or `tijp1:` clipboard
  strings. Existing browser import behavior for those strings remains unchanged.
- Existing built-in IDs are normalized by the runtime as `built-in-chart:<id>` and
  `built-in-design:<id>`, so the converter writes source IDs without those runtime prefixes.
- A chart export can include both `designPresetLibrary` and `dryMassPresetLibrary`; they are
  equivalent design snapshot sources and should be de-duplicated by source ID.
- If a source design ID already exists in the preset library, the converter should reuse that
  mapping for chart `selectedDesignPresetId` instead of generating a broken reference.
