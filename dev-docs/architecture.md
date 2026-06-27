# Working client architecture map

This document describes the editable source layout, generated Pages/output boundary, module boundaries, and verification rules for the drive comparison client.

It is a working architecture map, not a frozen design contract. Update it when `tools/drive_comparison_client/**`, builders, generated-output boundaries, or verification rules change materially. If it becomes stale, the current source, tests, and generated-output verifiers win.

The project uses native browser ES modules for the published GitHub Pages app. Source modules live under `tools/drive_comparison_client/` and are copied into `docs/assets/js/` during page rebuilds. Treat all of `docs/**` as generated Pages/output, including generated catalog Markdown files such as `docs/research_catalog.md` and `docs/ship_catalog.md`. Change source modules, builders, or source data and rebuild instead of editing published outputs directly.

## Goals

The module layout should keep feature work possible without rebuilding a hidden monolith across many files.

- `main.js` should stay a thin composition root: it registers the app-level wiring and starts the first render.
- `app/` owns cross-feature orchestration such as language refresh and whole-app reset helpers.
- `state/` owns shared state shape, constants, localized static data, and state mutation helpers.
- `calc/` owns pure calculations, filtering, and metric helpers.
- `chart/` owns chart rendering, viewport context, hit testing, and pointer interaction.
- `ui/` owns DOM controls, summaries, formatting, tooltips, and reusable UI helpers.
- `presets/` owns preset payloads, persistence, import/export, and preset UI wiring.
- `diagnostics/` owns debug helpers and may inspect internals, but normal runtime modules should not depend on it.
- `shared/` owns small utilities used across layers. Shared modules may depend on other shared modules, but not on feature folders.

## Dependency direction

Preferred dependency flow is downward from composition and UI toward lower-level state/calculation helpers:

```text
main.js
  -> app/
    -> ui/, chart/, presets/, dry mass feature modules
      -> calc/
        -> state/, shared/
      -> state/, shared/
```

Rules of thumb:

- `state/` should not import UI, chart, presets, diagnostics, or dry mass feature modules.
- `calc/` should not import UI, chart, presets, or diagnostics modules.
- `shared/` should only import other `shared/` modules or platform APIs.
- Runtime modules should not import `diagnostics/` except from `main.js` during explicit debug installation.
- UI modules should prefer public chart APIs over direct access to chart rendering internals.
- Preset modules should return payloads or call supplied callbacks instead of importing chart or dry mass internals directly.

The former broad `state/core.js` runtime hook registry has been reduced to a narrow metric calculation hook used by metric value definitions. Higher-level UI/chart/language orchestration now lives in `app/controller.js`.

The preset layer is now split into smaller submodules:

- `presets/runtime.js` stores callback hooks supplied by the composition root.
- `presets/common.js` stores shared preset labels, help text helpers, cloning, naming, and storage utilities.
- `presets/repository.js` owns preset normalization, built-in/user libraries, localStorage persistence, startup preset state, and export object creation.
- `presets/codec.js` owns clipboard, base64, compression, serialization, and parsing helpers.
- `presets/library.js` remains the compatibility facade for preset UI wiring, chart state import/export, and existing callers.


The dry mass calculator is now split along feature boundaries:

- `calc/dry_mass_model.js` owns catalog lookup, design normalization, armor/weapon/module calculations, simulation-default payload handling, and dry-mass preset import/export.
- `calc/dry_mass.js` remains a narrow compatibility facade that re-exports the model API for existing calculation/debug callers.
- `ui/dry_mass_calculator.js` owns the modal DOM rendering, localized text refresh, searchable-select enhancement, and event wiring. It receives the chart render callback from the UI composition layer instead of importing chart internals directly.

## Current ownership boundaries

- `tools/build_drive_comparison.py` owns generated `DATA.driveLinks`. The browser client consumes the edge list and should not re-infer research dependencies from family membership.
- `chart/rendering.js` owns line-segment rendering, point visual state helpers, impractical warning rings, and hover/selected/pinned SVG overlays. Calculation modules should only provide numeric values and filtering semantics.
- `chart/interaction.js` owns legend and compact chart-guide copy because that text must stay synchronized with rendered chart semantics and interaction behavior.
- `tools/drive_comparison_template.html` owns the Ship Designer grouping inside Simulation Conditions. `ui/dry_mass_calculator.js` continues to own the calculator modal and apply behavior; dry-mass formulas remain in the calculation layer.
- `docs/**` is generated Pages/output. `docs/index.html`, `docs/assets/js/**`, `docs/research_catalog.md`, and `docs/ship_catalog.md` should be changed only by editing source modules/builders/source data and rebuilding.

Some of these boundaries are still transitional. The import graph verifier currently fails on circular imports. Boundary warnings are available on demand with `--show-boundary-warnings`, and future cleanup PRs can promote more warnings to hard failures once the corresponding boundary is fully normalized.

## Verification

Run the module checks with:

```bash
npm run verify:modules
```

`npm run verify:js` also runs the import graph check after syntax verification.

The graph verifier fails if a circular import is introduced. This protects native ESM initialization order and keeps later refactors from re-creating a cross-module cycle.

To inspect remaining transitional boundary issues, run:

```bash
node tools/verify_drive_comparison_import_graph.mjs --show-boundary-warnings
```

For stricter local experimentation, run:

```bash
node tools/verify_drive_comparison_import_graph.mjs --strict-boundaries
```

The strict mode treats current boundary warnings as failures. It is useful while working on a specific boundary cleanup, but it is not yet the default because several planned follow-up PRs still intentionally touch transitional dependencies.

## Relationship with planning docs

Per-issue implementation plans, profiling notes, and temporary measurement reports belong under `dev-docs/plan/**`. Promote only durable architecture or boundary decisions back into this file. Do not update this file for one-off measurement rows, temporary prompts, or phase-local notes.

## When to update this file

Update this file when:

- a durable client module boundary changes;
- a new client source subdirectory becomes part of the architecture;
- generated-output policy changes;
- build or verification workflow changes;
- a performance/refactor issue produces a lasting architectural decision.

Do not update it just because generated `docs/**` outputs were rebuilt.

## Generated Pages/output

After source client changes, rebuild the generated Pages output:

```bash
npm run build
```

When local Terra Invicta template files are not available, source-only UI refactors rebuild the generated chart from the checked-in repo-local catalogs instead:

```bash
python scripts/rebuild_pages.py --ui-only --skip-verify --no-commit --no-push
```

The rebuild should keep `docs/**` reproducible from source modules, builders, and generated/source data. Treat generated catalog Markdown under `docs/` as output, not durable documentation.
