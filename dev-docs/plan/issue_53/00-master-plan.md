# Issue 53: Add generated drive catalog with localized drive metadata

## Issue Target And Scope Summary

- Issue target: #53, https://github.com/FennexFox/TI_Engine_Charts/issues/53
- Title: Add generated drive catalog with localized drive metadata
- Source plan: dev-docs/plan/issue_53/context.md and live GitHub issue body inspected on 2026-06-27.
- Work type: feature/refactor, generated data pipeline.
- Scope: introduce `data/generated/drive_catalog.json` as the project-local drive-data snapshot, regenerate it only during from-game builds, make normal builds consume repo-local generated catalogs instead of `docs/index.html` embedded data, and expose localized drive names/descriptions to the current UI without broad UI-localization work.

## Plan Contract

- User-visible problem or feature outcome: normal page rebuilds use repo-local catalog data, drive labels prefer Terra Invicta localization when catalog data provides it, and the detail card can show localized drive descriptions with existing fallback behavior.
- Implementation scope: add a drive catalog builder, integrate it into from-game and default rebuild flows, update chart data assembly to consume the catalog, update the detail-card subtitle fallback path, and document/validate the new source-of-truth boundary.
- Non-goals: do not vendor raw templates/localization files; do not rewrite the issue #51 UI localization system; do not change preset or localStorage schema unless required for stable IDs; do not make broad visual redesigns; do not hardcode one-off Poseidon/Neutron Flux mappings.
- Acceptance criteria that can fail: the catalog file exists and has normalized drive/power/radiator records; from-game rebuild regenerates it; normal build does not read local game templates or `docs/index.html` data; stable row IDs remain dataName-based; localized display/description fields are represented when available; missing localization falls back to existing row names and subtitle text; documented validation commands pass or limitations are recorded.
- Validation commands: `python -m compileall -q tools scripts`; focused builder smoke tests with temporary fixture data; `npm run build`; `npm run verify` when feasible.
- Manual smoke tests: inspect generated chart data for stable drive IDs/display fields/descriptions; inspect detail-card behavior in browser verification or equivalent generated-data assertions; confirm source metadata points at generated catalogs rather than `docs/index.html` for normal builds.
- Files likely to change: `tools/build_drive_catalog.py`, `tools/build_drive_comparison.py`, `scripts/rebuild_pages.py`, `tools/catalog_utils.py` if shared helpers are needed, `tools/drive_comparison_client/ui/tooltip_table.js`, `README.md` or `dev-docs/architecture.md`, `package.json` only if a script is needed, `data/generated/drive_catalog.json`, and expected regenerated `docs/**` outputs.
- Files that must not change: raw Terra Invicta template/localization files must not be added; unrelated preset/localStorage schemas must not change; generated `docs/**` content should only change through documented build commands.
- Generated artifact policy: source files and generated catalog snapshots are part of the implementation; `docs/index.html` and `docs/assets/js/**` are generated Pages output and may change only after a documented safe build.
- Stop conditions: stop if no local Terra Invicta templates are available for a required from-game catalog refresh and fixture-based generation cannot prove the change; stop if catalog consumption would require changing preset/localStorage identity semantics; stop if validation shows broad chart behavior changes that are not explainable by localized labels/descriptions.

## Strategy

- Keep canonical external data separate from project-local data: local Terra Invicta templates/localization are only read by explicit from-game catalog generation.
- Keep `data/generated/drive_catalog.json` app-oriented, not a raw dump: include drive, power plant, and radiator fields currently required by chart assembly plus localization metadata and source fingerprints.
- Refactor `tools/build_drive_comparison.py` so the chart row builder can consume normalized catalog records and no longer needs `--input-html-data` for the default UI-only path.
- Preserve existing row shape for client compatibility while adding optional metadata fields such as localized display names, raw display names, aliases, and description maps.
- Use generic localization key resolution for `TIDriveTemplate.displayName.<dataName>` and `TIDriveTemplate.description.<dataName>`.

## Phase Order

1. [Catalog generator and schema](01-catalog-generator.md)
2. [Builder and rebuild workflow consumption](02-builder-workflow.md)
3. [UI localized metadata behavior](03-ui-metadata.md)
4. [Validation, generated output, and final audit](04-validation-audit.md)

## Phase Dependencies

- Phase 1 has no phase dependency beyond resolved issue context and current builder discovery.
- Phase 2 depends on Phase 1 catalog schema and fixture/generated catalog compatibility.
- Phase 3 depends on Phase 2 chart data exposing localized names/descriptions in client row data.
- Phase 4 depends on all implementation phases and records final evidence against the GitHub acceptance criteria.

## Source Of Truth Decisions

- The canonical external source is the user's local Terra Invicta install: `Templates` plus sibling `Localization`.
- The project-local app source of truth for drive comparison data becomes `data/generated/drive_catalog.json` together with existing `research_catalog.json` and `ship_catalog.json`.
- `docs/index.html` and `docs/assets/js/**` remain published generated output and must not be used as durable normal-build input after Phase 2.
- Stable drive identity remains the raw `dataName`; localized display strings are presentation metadata only.
- `00-master-plan.md` and phase files are the executable implementation plan; `context.md` remains background input, not a checklist.

## Generated-file Policy

- Include `data/generated/drive_catalog.json` because issue #53 explicitly requires a repo-local generated drive catalog snapshot.
- Regenerate `docs/index.html` and `docs/assets/js/**` through `npm run build` or the guarded WSL helper after source changes that affect published output; inspect generated output only by targeted assertions or summary, not broad manual review.
- Do not add raw Terra Invicta templates or full localization files to the repo.
- Use from-game rebuild commands only when explicitly refreshing catalog data from a local install.

## Global Validation Expectations

- `python -m compileall -q tools scripts`
- Focused fixture generation for `tools/build_drive_catalog.py` when local game templates are not available.
- `npm run build`
- `npm run verify` or documented narrower verification if browser/dependency environment blocks full verification.

## Known Risks And Assumptions

- A local Terra Invicta install may not be available in this environment; fixture-based tests may be needed for catalog generation semantics.
- Existing generated page data may contain names that differ from fresh localized output, so generated artifact diffs need to be interpreted carefully.
- Client sorting/search may currently use `row.displayName`; localized labels must not invalidate IDs, pins, presets, or localStorage.
- Radiator localization currently appears derived from research project display in the old builder; Phase 1 should avoid expanding issue scope beyond fields needed by chart behavior.

## Completion Classification Rules

- Complete: all issue acceptance criteria are satisfied, current evidence proves normal builds consume generated catalogs without local game templates or `docs/index.html` input, validation is recorded, and final audit passes.
- Partially complete: a catalog exists and some builder/UI behavior works, but one or more acceptance criteria lacks evidence or remains implemented only by fixtures.
- Preparation / instrumentation only: plan/docs/tests are prepared but the app source-of-truth behavior is not changed.
- Blocked: implementation cannot proceed after repeated turns because required external Terra Invicta data or user direction is unavailable and no fixture/proxy validation can advance the work.
- Needs follow-up issue: issue #53 scope is met but broader translator workflow or additional locales need separate work under issue #51 or a new issue.

## Final Audit Checklist

- [ ] Final diff reviewed against issue body and user request.
- [ ] Final diff reviewed against this master plan.
- [ ] Phase acceptance criteria checked.
- [ ] Validation results recorded.
- [ ] Manual smoke test results recorded or explicitly deferred.
- [ ] Generated-file policy followed.
- [ ] Phase-sized commit flow audited.
- [ ] Commit blockers documented when phase-sized commits were skipped.
- [ ] Commit-flow classification assigned.
- [ ] Completion classification assigned honestly.

## Commit Audit Requirements

- Phase-sized commits required: yes, unless the user explicitly says not to commit.
- Plan / baseline phase commit expectation: commit before source implementation when the plan or baseline changed.
- Per-phase commit expectation: commit each implementation phase separately when staging is safe.
- Commit blocker policy: document blocker in the relevant phase plan and final report before proceeding without a phase commit.
- Generated artifact policy: include generated artifacts only when repository policy requires them.
- Commit-flow non-compliance outcome: report separately in Final Audit even if implementation works.
