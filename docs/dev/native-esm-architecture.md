# Native ES Module Architecture

This project uses native browser ES modules for the drive comparison client. The published GitHub Pages app loads `docs/assets/js/main.js` with `type="module"`; the source modules live under `tools/drive_comparison_client/` and are copied into `docs/assets/js/` during the page rebuild.

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

## Generated assets

After source client changes, rebuild the published page assets:

```bash
npm run build
```

When local Terra Invicta template files are not available, source-only UI refactors can rebuild the generated chart from the already embedded page data instead:

```bash
python scripts/rebuild_pages.py --ui-only --skip-verify --no-commit --no-push
```

The rebuild should keep `docs/index.html` and `docs/assets/js/` reproducible from the source modules.
