# Add first-run chart-reading guidance for research cost, mass, and acceleration tradeoffs

## Issue Target And Scope Summary

- Issue target: #34
- Title: Add first-run chart-reading guidance for research cost, mass, and acceleration tradeoffs
- Source plan: GitHub issue body, checked on 2026-06-16.
- Scope: Add concise, player-facing guidance in the chart area so a first-time user can read the research-cost X axis, selected-metric Y axis, lower-left tradeoff, acceleration caveat, and selected ship/dry-mass assumptions without external documentation.

## Plan Quality Review

- The issue is copy and information architecture, not calculation behavior. The plan keeps all drive math and filtering semantics out of scope.
- The guidance must be visible enough to be noticed on first run. Relying only on a collapsed floating chart guide is too weak, so Phase 1 adds a compact chart-adjacent reading summary and keeps the existing compact guide focused on visual encodings.
- The wording must be concrete but not overstate "lower-left is best." The planned copy explicitly says lower-left is a starting point and that acceleration, mission role, and current ship assumptions can change the answer.
- English and Korean text must be owned in source client modules or static i18n mappings. Generated `docs/**` files are changed only through `npm run build`.

## Strategy

- Add a small chart-reading summary near the plot, after chart-level warnings and before the chart body.
- Render the summary dynamically from current state so it references the active metric, target dV, selected Ship Designer status or dry mass, and acceleration threshold where relevant.
- Keep the existing `Chart Guide` details component for symbols, opacity, Pareto, warning rings, and selection behavior.
- Extend browser verifier coverage to assert English/Korean copy, lower-left interpretation, Acceleration terminology, and no mobile overflow.
- Regenerate published output only via the default checked-in/UI-only build.

## Phase Order

1. [Chart-reading guidance copy and placement](01-guidance-copy.md)
2. [Build and visual verification](02-verification.md)

## Phase Dependencies

- Phase 1 has no phase dependency beyond resolved issue context and source review.
- Phase 2 depends on completion of Phase 1 source changes.

## Source Of Truth Decisions

- `00-master-plan.md` is the phased implementation plan source of truth for issue #34.
- Phase files in this directory define phase-local scope and validation.
- `tools/drive_comparison_client/**`, `tools/drive_comparison_template.html`, `tools/drive_comparison_styles.css`, and `tools/drive_comparison_i18n.py` remain the source of truth.
- `docs/index.html` and `docs/assets/js/**` are generated artifacts and must not be edited directly.
- The implementation should use "Acceleration" in player-facing English while tolerating internal `TWR` identifiers.

## Global Validation Expectations

- `npm run build`
- `npm run verify`
- Focused Playwright visual smoke checks on desktop and narrow-width layouts.

## Known Risks And Assumptions

- Adding visible guidance can overcrowd the chart area. Mitigation: use short cue labels and a responsive strip that wraps before overflowing.
- Copy can imply a universal ranking. Mitigation: explicitly frame lower-left as a starting point under current assumptions, not a universal answer.
- Static and dynamic localization paths differ. Mitigation: keep the new reading summary dynamic through `localText()` and add static replacements only for template fallback text.
- Issue #38 may move nearby controls in the same chart area. Mitigation: keep #34 guidance structurally independent from #38 chart controls while allowing shared styles.

## Status

- Created: 2026-06-16
- Plan quality review: completed before implementation.
- Execution status: completed
- Completed phases:
  - Phase 1 chart-reading guidance copy and placement
  - Phase 2 build and visual verification
- Validation completed:
  - `npm run build`
  - `LD_LIBRARY_PATH=/snap/chromium/3459/usr/lib/x86_64-linux-gnu:/snap/gnome-46-2404/153/usr/lib/x86_64-linux-gnu npm run verify`
  - Focused Playwright screenshots for desktop and narrow chart-area layouts
