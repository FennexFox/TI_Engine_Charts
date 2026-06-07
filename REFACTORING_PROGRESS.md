# Refactoring Progress

_Last updated: 2026-06-07_

## Current status

A first low-risk refactoring pass has been completed.  The pass intentionally
focused on build structure and source organization rather than changing chart
math or attempting another speculative fix for the unresolved extreme log-zoom
tick issue.

## Completed in this pass

### 1. Repository audit

Reviewed the repository layout and identified `tools/build_drive_comparison.py`
as the main refactoring target.  The file remains the largest and most coupled
part of the repository because it combines Python data preparation with the
standalone page's CSS, HTML, and client JavaScript.

### 2. Refactoring plan document

Added this root-level design document:

- `REFACTORING_PLAN.md`

It describes the current structure, main risks, proposed phased architecture,
and what should not be attempted in the current pass.

### 3. Progress tracking document

Added this root-level tracking document:

- `REFACTORING_PROGRESS.md`

It records what was actually changed, what was validated, and what remains.

### 4. Extracted Python-side i18n/portability helpers

Created:

- `tools/drive_comparison_i18n.py`

Moved these Python-side responsibilities out of `tools/build_drive_comparison.py`:

- static English replacement pairs;
- note HTML translations;
- `portable_data()` and related portable source-label helpers;
- `client_translation_pairs()` and `note_html_translations()`.

`tools/build_drive_comparison.py` now imports these helpers instead of carrying
that static data inline.  This reduces unrelated content in the main builder and
makes future i18n cleanup safer.

### 5. Added UI-only rebuild support

Added `--input-html-data` to `tools/build_drive_comparison.py`.

Example:

```bash
python tools/build_drive_comparison.py \
  --input-html-data docs/index.html \
  --portable \
  --output docs/index.html
```

This reuses the embedded `<script id="ti-data" type="application/json">` payload
from an existing generated page.  It allows UI/template-only rebuilds without a
local Terra Invicta installation or template directory.

### 6. Added script-level UI-only rebuild mode

Updated `scripts/rebuild_pages.py` with:

- `--ui-only`
- `--input-html-data`
- safe `--no-commit` handling when the repository is unpacked from a zip and `.git` is absent

Example:

```bash
python scripts/rebuild_pages.py \
  --ui-only \
  --input-html-data docs/index.html \
  --skip-verify \
  --no-commit \
  --no-push
```

When `--ui-only` is used, catalog regeneration is skipped and the chart page is
rebuilt from existing embedded page data.

### 7. Rebuilt generated page from embedded data

Regenerated:

- `docs/index.html`

using the new UI-only data path.  No Terra Invicta template directory was used.
The existing embedded chart data was preserved.

## Validation performed

The following checks passed:

```bash
python -m py_compile tools/*.py scripts/*.py
```

The generated page's main JavaScript was extracted from `docs/index.html` and
checked with Node:

```bash
node --check /tmp/ti_generated_main.js
```

The direct UI-only rebuild and the script-level UI-only rebuild both completed successfully.  The script-level command was run with `--skip-verify --no-commit --no-push` so it can work from an unpacked zip without a `.git` directory.  The rebuild reported:

- Drive variants: 523
- Categories: 6
- Subfamilies: 18
- Game version: 1.0.32

## Not completed in this pass

### Full template extraction

The embedded HTML/CSS/JS template still lives in `tools/build_drive_comparison.py`.
The plan recommends moving it into separate source files in a later pass, while
still emitting one standalone HTML file.

### Client-side JavaScript modularization

The client JS is still embedded in the template.  The following areas still need
source-level separation later:

- axis and tick planning;
- chart rendering;
- left panel state/persistence;
- searchable select component;
- dry-mass calculator;
- detail cards;
- diagnostics and filtering.

### Extreme log-zoom tick issue

The deep-zoom log tick rendering issue is not claimed to be fixed in this pass.
The relevant code is cleaner than before, but the behavior still needs browser
instrumentation.  Recommended next debug step:

1. add an axis-debug panel or console dump for current visible x/y domains;
2. log `buildAxisTickPlan()` output count, first tick, last tick, label count,
   and pixel positions;
3. reproduce the problematic zoom state in a browser;
4. use those measurements to determine whether the issue is domain calculation,
   tick generation, label filtering, SVG clipping, or interaction state.

## Files changed or added

Added:

- `REFACTORING_PLAN.md`
- `REFACTORING_PROGRESS.md`
- `tools/drive_comparison_i18n.py`

Modified:

- `tools/build_drive_comparison.py`
- `scripts/rebuild_pages.py`
- `docs/index.html`

## Suggested next pass

The next refactoring pass should be mechanical and focused:

1. move the HTML template, CSS, and client JS out of the Python file;
2. keep the generated output identical except for formatting/minor whitespace;
3. add an automated generated-JS syntax check script;
4. then isolate the axis/tick code into its own client-side source section.
