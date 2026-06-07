# Refactoring Plan

_Last updated: 2026-06-07_

## Scope reviewed

This repository is a static Terra Invicta engine-chart generator.  The current
runtime page is generated as a single standalone HTML file, so most of the UI is
assembled by `tools/build_drive_comparison.py` and emitted into `docs/index.html`.

Important paths:

- `tools/build_drive_comparison.py` — main drive-comparison data builder and
  standalone HTML/CSS/JS template emitter.
- `tools/ti_chart_core.py` — shared template-loading and source-resolution
  helpers.
- `tools/ship_math.py` — shared ship component math used by the chart builder.
- `tools/build_research_catalog.py`, `tools/build_ship_catalog.py` — static
  catalog generators.
- `scripts/rebuild_pages.py` — full GitHub Pages rebuild/deploy entry point.
- `docs/index.html` — generated output; should not be manually edited.

## Findings

### What is already reasonably separated

The Python-side catalog/template utilities are already split into small modules:
`ti_chart_core.py` and `ship_math.py` keep reusable data-loading and ship-math
logic outside the page builder.  The catalog builders are also separate from the
interactive engine-chart builder.

### Main refactoring pressure

The main issue is not the Python data pass itself; it is that
`tools/build_drive_comparison.py` contains several responsibilities at once:

1. Terra Invicta template normalization.
2. drive/power/radiator compatibility and derived metric preparation.
3. static translation replacement data.
4. CSS for the whole page.
5. HTML structure for the whole page.
6. client-side state, filtering, searchable selects, left-panel persistence,
   dry-mass calculator, chart rendering, axes/ticks, and detail cards.
7. output-portability handling.

This makes targeted UI work possible, but repeated small patches can easily
make the script hard to reason about.  The axis tick work is a good example:
several iterations touched the same area, and although the code is now more
centralized than before, the browser behavior still needs deeper debugging.

### Generated output size

`docs/index.html` is intentionally large because the site is a standalone static
page.  Refactoring should preserve this deployment model unless there is a
clear decision to move to multiple assets.  The safer path is to split builder
source files while still inlining CSS/JS into one HTML output.

## Refactoring goals

1. Preserve the single-file generated page and current GitHub Pages deployment.
2. Reduce the size and responsibility count of `build_drive_comparison.py`.
3. Make UI-only rebuilds possible without a local Terra Invicta installation.
4. Keep generated data and generated UI clearly separated.
5. Make future debugging easier, especially for axes/ticks and panel state.
6. Avoid large behavioral rewrites without browser-based regression checks.

## Proposed architecture

### Phase 0 — build and audit safety

- Add a UI-only rebuild path that reuses embedded `docs/index.html` data.
- Keep full rebuild behavior unchanged when a template directory is available.
- Document current code structure and refactoring progress.

### Phase 1 — low-risk Python extraction

Move Python-only static/helper logic out of `build_drive_comparison.py`:

- static English translation replacement pairs;
- note HTML translations;
- portable-output path scrubbing helpers.

These helpers do not depend on the client-side JS template and are safe to
extract first.

### Phase 2 — template source separation

Split the large embedded template into source files while preserving a single
output HTML file:

- `tools/drive_comparison_template.html`
- `tools/drive_comparison_styles.css`
- `tools/drive_comparison_client.js`

The Python builder would read these files and replace placeholders.  This is
mostly mechanical but should be done in a separate change because it touches a
large amount of text.

### Phase 3 — client-side module boundaries

After the client JS is in its own source file, split responsibilities into
clearly marked modules or separate build-time-inlined files:

- state and persistence;
- i18n/local text;
- axis scale and tick planning;
- chart renderer;
- detail cards;
- left panel cards;
- searchable select component;
- dry-mass calculator;
- diagnostics/filtering.

The page can still be emitted as one HTML file.  The source code does not have
to be one file.

### Phase 4 — tests and diagnostics

Add focused checks before more UI refactoring:

- Python compile checks for all tools/scripts.
- generated JS syntax check extracted from `docs/index.html`.
- browser smoke test for page load, language switch, dry-mass calculator,
  searchable selects, left panel state, and basic chart rendering.
- pure JS or browser test for axis tick coverage at known zoom domains.

The unresolved deep-zoom log tick behavior should be debugged with a temporary
or permanent axis-debug view that shows the current visible domain, generated
space domain, tick count, label count, and first/last tick.

## Recommended next steps

1. Keep the small helper extraction and UI-only rebuild support.
2. Use the new UI-only rebuild path for interface-only work when the game
   templates are not available.
3. In the next larger pass, extract CSS/JS/template files from the Python string.
4. Only then revisit the log tick rendering issue with browser diagnostics,
   because it likely requires observing actual visible domains and rendered SVG
   output rather than continuing to patch the tick generator by inspection.

## Non-goals for the current pass

- Do not change chart calculations or game data interpretation.
- Do not migrate to a bundled frontend framework.
- Do not split the deployed site into multiple required runtime assets yet.
- Do not claim the unresolved extreme log-zoom tick issue is fixed without a
  browser reproduction and regression test.
