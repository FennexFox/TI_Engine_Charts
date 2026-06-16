# Review default chart scale and control placement for first-time readability

## Issue Target And Scope Summary

- Issue target: #38
- Title: Review default chart scale and control placement for first-time readability
- Source plan: GitHub issue body, checked on 2026-06-16.
- Scope: Confirm and implement first-run axis-scale defaults, preserve explicit preset scale choices, and make chart-level scale/filter/display state easier to notice from the chart area.

## Plan Quality Review

- Initial source review showed `state` and `chartDefaultState()` already defaulted to `logX: true` and `logY: true`, but startup applied the first built-in chart preset from `data/preset_library.json`, which still set `logX: false`, `logY: true` before this implementation. The plan treats the built-in preset as the authoritative first-run default.
- Exported user presets already include explicit `logX` and `logY`, and `applyPresetToState()` only applies them when booleans are present. This supports a narrow migration: change built-in/default state without rewriting saved user presets.
- The issue asks for more noticeable controls or summaries, not a full redesign. The plan adds chart-adjacent scale controls and an active-state summary while keeping detailed filters in the left panel.
- The plan avoids making the left panel heavier. It moves first-run attention to the chart shell rather than adding more left-panel content.

## Strategy

- Change the first built-in chart preset to log/log and make static template fallback checkboxes match source defaults.
- Add chart-adjacent scale toggles for Log X and Log Y that sync with the existing left-panel controls.
- Add a compact active chart summary near the plot that states scale, engine count, category/family filter coverage, search state, and relevant display mode.
- Keep detailed filter controls in the left panel and keep actionable warning/reset behavior from issue #33 intact.
- Add verifier coverage for first-run log/log default, explicit preset preservation, chart-adjacent controls, localization, and narrow-width layout.

## Phase Order

1. [Default scale and chart-adjacent controls](01-defaults-and-controls.md)
2. [Build and responsive verification](02-verification.md)

## Phase Dependencies

- Phase 1 depends on source review of default state, built-in presets, template fallback controls, and preset import/export behavior.
- Phase 2 depends on completion of Phase 1 source changes.

## Source Of Truth Decisions

- `00-master-plan.md` is the phased implementation plan source of truth for issue #38.
- Phase files in this directory define phase-local scope and validation.
- The default first-run chart state is the first built-in chart preset in `data/preset_library.json`, because startup applies it when no saved startup preset is selected.
- User-saved presets are intentionally not migrated; their explicit `logX`/`logY` values remain authoritative.
- `tools/drive_comparison_client/**`, `tools/drive_comparison_template.html`, `tools/drive_comparison_styles.css`, `tools/drive_comparison_i18n.py`, and `data/preset_library.json` are source/input files.
- `docs/index.html` and `docs/assets/js/**` are generated artifacts and must not be edited directly.

## Global Validation Expectations

- `npm run build`
- `npm run verify`
- Focused Playwright desktop/narrow viewport smoke checks for chart-adjacent controls and summaries.

## Known Risks And Assumptions

- Log scale can hide invalid/nonpositive values on axes that require positive domains. Current rendering already handles log-axis domain filtering and default metrics are positive; verifier coverage must confirm points still render.
- Duplicate scale controls can desynchronize if they update state independently. Mitigation: route both chart-adjacent and left-panel controls through the same state and `syncUiFromState()` path.
- A summary row can become text-heavy on narrow screens. Mitigation: use short localized phrases and responsive wrapping.
- Changing the built-in preset changes first-run behavior but should not rewrite existing localStorage user presets.

## Status

- Created: 2026-06-16
- Plan quality review: completed before implementation.
- Execution status: completed
- Completed phases:
  - Phase 1 default scale and chart-adjacent controls
  - Phase 2 build and responsive verification
- Validation completed:
  - `npm run build`
  - `LD_LIBRARY_PATH=/snap/chromium/3459/usr/lib/x86_64-linux-gnu:/snap/gnome-46-2404/153/usr/lib/x86_64-linux-gnu npm run verify`
  - Focused Playwright screenshots for desktop and narrow chart-area layouts
