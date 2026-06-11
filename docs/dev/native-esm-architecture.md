# Native ES Module Architecture

This project uses native browser ES modules for the drive comparison client. The published GitHub Pages app loads `docs/assets/js/main.js` with `type="module"`; the source modules live under `tools/drive_comparison_client/` and are copied into `docs/assets/js/` during the page rebuild.

## Goals

The module layout should keep feature work possible without rebuilding a hidden monolith across many files.

- `main.js` should stay a composition root: it wires modules together, registers lifecycle hooks, and starts the first render.
- `state/` owns shared state shape, constants, localized static data, and state mutation helpers.
- `calc/` owns pure calculations, filtering, and metric helpers.
- `chart/` owns chart rendering, viewport context, hit testing, and pointer interaction.
- `ui/` owns DOM controls, summaries, formatting, tooltips, and reusable UI helpers.
- `presets/` owns preset payloads, persistence, import/export, and preset UI wiring.
- `diagnostics/` owns debug helpers and may inspect internals, but normal runtime modules should not depend on it.
- `shared/` owns small dependency-free utilities used across layers.

## Dependency direction

Preferred dependency flow is downward from composition and UI toward lower-level state/calculation helpers:

```text
main.js
  -> ui/, chart/, presets/, dry mass feature modules
    -> calc/
      -> state/, shared/
    -> state/, shared/
```

Rules of thumb:

- `state/` should not import UI, chart, presets, diagnostics, or dry mass feature modules.
- `calc/` should not import UI, chart, presets, or diagnostics modules.
- `shared/` should remain dependency-free.
- Runtime modules should not import `diagnostics/` except from `main.js` during explicit debug installation.
- UI modules should prefer public chart APIs over direct access to chart rendering internals.
- Preset modules should return payloads or call supplied callbacks instead of importing chart or dry mass internals directly.

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

The rebuild should keep `docs/index.html` and `docs/assets/js/` reproducible from the source modules.
