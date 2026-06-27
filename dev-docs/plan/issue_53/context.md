# Issue 53 context: generated drive catalog with localized drive metadata

This file is context for future planning and implementation work. It is not a concrete task prompt, not a phase plan, and not an implementation checklist.

The intended workflow is that a later local Codex run reads this file, then uses the local `implement-phased-issue` skill to generate the actual phased work instructions for Issue 53.

## Canonical issue

Remote issue: <https://github.com/FennexFox/TI_Engine_Charts/issues/53>

Title: `Add generated drive catalog with localized drive metadata`

Issue 53 is open and is the correct issue for this work.

## Why this issue exists

The repo already has normalized repo-local catalog snapshots for some Terra Invicta game data:

- `data/generated/research_catalog.json`
- `data/generated/ship_catalog.json`

Those catalogs let the project avoid treating raw Terra Invicta template files or generated Pages output as the durable app data source.

The core drive comparison data is less clean. Drive, power plant, and radiator templates are currently processed into the published chart output, and normal UI-only rebuild flows may end up preserving/reusing `docs/index.html` embedded `DATA`. That makes `docs/index.html` feel like the durable data source even though `docs/**` is generated Pages output.

Issue 53 exists to introduce a repo-local generated drive catalog so the project has a clearer source-of-truth boundary for drive comparison data.

## Important design distinction

Use this terminology consistently when planning the work:

```text
Canonical external source:
  The user's local Terra Invicta install: Templates and Localization files.

Project-local data snapshot / app SoT:
  Normalized generated catalogs committed in the repo, e.g. data/generated/*.json.

Published output:
  docs/index.html and docs/assets/** for GitHub Pages.
```

The goal is not to make the repo the canonical source of Terra Invicta game truth. The goal is to make the repo-local normalized catalog the app's project-local source of truth, so normal app rebuilds do not depend on the local game install and do not treat `docs/index.html` embedded data as primary input.

## Existing catalog precedent

Research catalog:

```text
source:
  Terra Invicta Templates/TITechTemplate.json
  Terra Invicta Templates/TIProjectTemplate.json
  Terra Invicta Localization/TITechTemplate.*
  Terra Invicta Localization/TIProjectTemplate.*

repo snapshot:
  data/generated/research_catalog.json
  docs/research_catalog.md
```

Ship/module catalog:

```text
source:
  Terra Invicta ship hull, utility module, armor, and weapon templates
  corresponding localization files

repo snapshot:
  data/generated/ship_catalog.json
  docs/ship_catalog.md
```

These catalogs are not raw data dumps. They are normalized, app-oriented snapshots containing only the fields the project needs, plus derived relationships and metadata where appropriate.

Issue 53 should follow that pattern for drive comparison data.

## Desired catalog concept

The likely catalog path is:

```text
data/generated/drive_catalog.json
```

The exact schema should follow existing project conventions after inspection, but conceptually it should cover:

- drive templates
- power plant templates
- radiator templates
- stable raw `dataName` identifiers
- raw/fallback display names
- localized drive display names, where available
- localized drive descriptions, where available
- aliases/fallback metadata useful for search/debugging
- source fingerprints and detected game version metadata, where appropriate

Do not vendor raw Terra Invicta template files or full localization files wholesale into the repo.

## Localization context

The immediate visible bug motivating this work is that some raw datafile drive names differ from current game localization names.

Known example:

- Poseidon-family drives may still appear under older `Neutron Flux`-style raw names if the UI uses datafile names directly.

The drive catalog should resolve localization keys such as:

```text
TIDriveTemplate.displayName.<dataName>
TIDriveTemplate.description.<dataName>
```

Example provided during planning:

```text
TIDriveTemplate.displayName.ApexSolidRocketx1=Apex Solid Rocket x1
TIDriveTemplate.description.ApexSolidRocketx1=Powerful but inefficient rocket that mixes polybutadiene acrylonitrile with an ammonium perchlorate oxidizer to produce thrust.
```

Identity and display text must remain separate. Do not replace stable IDs with localized names.

Conceptual shape only:

```json
{
  "dataName": "ApexSolidRocketx1",
  "rawDisplayName": "Apex Solid Rocket x1",
  "displayName": {
    "en": "Apex Solid Rocket x1"
  },
  "description": {
    "en": "Powerful but inefficient rocket that mixes polybutadiene acrylonitrile with an ammonium perchlorate oxidizer to produce thrust."
  }
}
```

The actual schema may differ if the existing data model suggests a better shape.

## Detail-card UI context

A later UI-facing slice should use localized drive descriptions in the right-side drive detail card.

The desired UI behavior discussed before Issue 53 was:

- Put the localized `TIDriveTemplate.description.<dataName>` text directly under the title/subtitle heading area in the right-side detail card.
- That description should replace the current category/family/project line for that detail-card subtitle area.
- The current line looks conceptually like `Chemical / Chemical · Solid-Fuel Space Rockets`.
- If no description exists, fall back to the existing category/family/project line rather than leaving the area blank.

Earlier investigation pointed at this likely UI area:

```text
tools/drive_comparison_client/ui/tooltip_table.js
```

Do not treat this path as authoritative without re-checking the current source. The implementation plan should verify the current file layout before editing.

## Intended build model

The desired long-term build model is:

```text
npm run build
  uses repo-local generated catalogs
  rebuilds docs/index.html and client assets

npm run build:from-game
  reads the local Terra Invicta install
  regenerates data/generated/*.json catalogs
  rebuilds docs/index.html
```

The local game install remains necessary for full data refreshes. Normal UI builds should not need it.

Current behavior may not exactly match this model. The implementation plan should inspect the actual scripts before deciding the phase split.

## Relationship to Issue 51

Issue 51 is about translator-friendly app/UI localization workflow. It is broader and should remain separate.

Issue 53 is a prerequisite/data-pipeline slice that makes drive display names and descriptions available as normalized game-data metadata. Once Issue 53 lands, Issue 51 can consume the drive catalog fields while focusing on UI copy localization separately.

Do not use Issue 53 to rewrite the full UI localization system or convert all `localText()` usage.

A previous local Codex task for Issue 51 was intentionally abandoned after deciding that Issue 53 should come first. Future Issue 51 instructions should be regenerated after Issue 53's architecture is known.

## Suggested implementation concerns to investigate

These are investigation leads, not fixed instructions:

- Where `build_drive_comparison.py` currently reads drive, power plant, and radiator template files.
- How `scripts/rebuild_pages.py` decides between UI-only rebuilds and from-game rebuilds.
- How existing generated catalogs are built and consumed.
- Whether a new `tools/build_drive_catalog.py` script is appropriate, or whether an existing builder should be split.
- Whether `docs/index.html` embedded `DATA` can stop being the fallback input for normal builds.
- How source fingerprints and game version metadata are represented in existing catalogs.
- How tests/verifiers currently validate generated data and UI data shape.
- Whether saved presets, pins, comparison state, and localStorage depend on current display names instead of stable IDs.

## Boundaries and non-goals

Planning should preserve these boundaries unless the issue body is explicitly changed:

- Do not vendor raw Terra Invicta template files.
- Do not vendor full localization files wholesale.
- Do not make broad visual/UI changes while introducing the catalog.
- Do not change preset/localStorage schema unless strictly necessary.
- Do not replace stable drive IDs with localized labels.
- Do not hardcode one-off mappings such as `Neutron Flux -> Poseidon`.
- Do not implement the whole Issue 51 UI localization workflow as part of Issue 53.

## Expected user-facing outcome

After the issue is fully implemented, the app should be able to rely on repo-local generated drive catalog data for drive comparison builds.

Drive display labels should prefer Terra Invicta localization when available, while retaining raw names/aliases for fallback, debugging, and search. Drive descriptions should also be available to the UI, especially for the right-side detail card.

The visible Poseidon/Neutron Flux mismatch should be resolved by generic localization resolution, not by a Poseidon-specific patch.

## Verification context

The actual verification commands should be determined from the current repo scripts, but likely candidates include:

```bash
npm run build
npm run verify
npm test
```

If from-game rebuild commands require a local Terra Invicta install, the plan should distinguish commands that are safe for CI/default verification from commands that are local-only.

Generated output behavior should be called out explicitly in any resulting PR:

- whether `data/generated/drive_catalog.json` was created or regenerated;
- whether `docs/index.html` was regenerated;
- whether catalog markdown docs were added or intentionally omitted;
- whether Pages behavior changed.

## Open planning questions

These should be answered during phased planning:

1. Should the drive catalog include only drives, or also power plants and radiators in the same file?
2. Should the catalog include localized names/descriptions for power plants and radiators too, or only drives for this issue?
3. Should there be a generated markdown doc analogous to `docs/research_catalog.md` and `docs/ship_catalog.md`?
4. How much of the current UI-only build fallback to `docs/index.html` should be removed in the first PR?
5. Should Issue 53 be split into phases such as catalog generation first, builder consumption second, UI description usage third?
